# Infrastructure / Observability

This directory is split into two deliberately different tracks:

| Layer | How it's provisioned | Why |
|---|---|---|
| Compute & networking (VPC, EC2, Security Group, IAM role) | **Manual, AWS Console** | These are the actual beginner learning objectives — clicking through a security group or attaching an IAM role builds the mental model. Terraform is reserved for the advanced curriculum; using it here would abstract away the thing students are supposed to be learning. |
| Observability (CloudWatch log groups, metric filters, alarms, dashboard, SNS) | **Terraform, provided** | Hand-building 4 log groups, 2 metric filters, 4 alarms, an SNS topic, and a dashboard through the console is tedious and teaches little. The objective here is "get monitoring live," not "understand CloudWatch primitives." Students run this, they don't author it. |

Do the console steps first — the Terraform in this repo needs your EC2 instance ID as an input.

---

## Part A — Provision compute manually (AWS Console)

Complete these in order. Everything here uses your account's **default VPC**
to stay in scope — creating a custom VPC is a good stretch goal, not a
requirement, unless your curriculum has already covered subnets/route tables.

### A1. Create the IAM role

1. Console → **IAM → Roles → Create role**
2. Trusted entity type: **AWS service** → Use case: **EC2** → Next
3. Attach these two AWS-managed policies:
   - `CloudWatchAgentServerPolicy`
   - `AmazonSSMManagedInstanceCore` (lets you connect via SSM Session Manager
     instead of opening an SSH port — recommended)
4. Name it something like `capstone-dev-ec2-role` → Create role

(Creating a role for the EC2 use case automatically creates a matching
instance profile — you don't need a separate step for that.)

### A2. Create the security group

1. Console → **EC2 → Security Groups → Create security group**
2. Inbound rules:
   - If using SSM (recommended): no inbound SSH rule needed at all.
   - If using SSH: port 22, source = **your IP only**, never `0.0.0.0/0`.
   - Port `3000` (the app), source = your IP or `0.0.0.0/0` for the demo —
     document whichever you choose, this is a legitimate Security-track
     discussion point.
3. Outbound: leave the default (all traffic allowed).

### A3. Launch the EC2 instance

1. Console → **EC2 → Launch instance**
2. AMI: Amazon Linux 2023 (matches the log paths in
   `cloudwatch-agent-config.json` — see the note below if you use Ubuntu instead)
3. Instance type: `t3.micro` / `t3.small` is enough for this workload
4. Network: default VPC, a public subnet, auto-assign public IP = enabled
5. Security group: the one from A2
6. **Advanced details → IAM instance profile**: select the role from A1
7. Launch, and note the **Instance ID** — you'll need it for the Terraform
   variable `ec2_instance_id` in Part B

Once it's running, install Docker and deploy the app per `app/README.md`,
and set up the traffic generator per `traffic-generator/README.md`.

> **Using Ubuntu instead of Amazon Linux?** Change the SSH log path in
> `cloudwatch-agent-config.json` from `/var/log/secure` to `/var/log/auth.log`,
> and swap `yum` for `apt-get` in the agent install step below.

---

## Part B — Deploy the CloudWatch layer (Terraform, provided)

### What this step actually does (that's all the Terraform you need to know)

Running `terraform apply` reads the `.tf` files in this folder, compares them
against what currently exists in your AWS account, and creates whatever's
missing — in this case, the log groups, alarms, dashboard, and SNS topic
described below. That's the entire concept. You're running a script someone
else wrote, the same way you'd run a `deploy.sh` — you don't need to open or
understand the `.tf` files to use them. (If you're curious, they're plain
text and worth a skim — but that's optional, and it's what the advanced
track goes deeper on.)

### B1. Apply it

```bash
cd terraform
terraform init
terraform apply \
  -var="ec2_instance_id=i-0123456789abcdef0" \
  -var="alarm_email=you@example.com" \
  -var="environment=dev"
```

This creates:
- 4 CloudWatch log groups (`app`, `access`, `auth`, `ssh`)
- 2 metric filters (failed logins, HTTP 5xx count)
- 4 alarms (possible brute force, elevated error rate, high CPU, low disk)
  wired to an SNS topic that emails `alarm_email`
- 1 CloudWatch dashboard

Confirm the SNS subscription email and click **Confirm subscription**, or
alarms will fire silently into the void.

### B2. Install and configure the CloudWatch agent on the EC2 host

```bash
sudo yum install -y amazon-cloudwatch-agent   # Amazon Linux
# sudo apt-get install -y amazon-cloudwatch-agent  # Ubuntu

# Replace ${environment} with your actual environment (e.g. dev) before
# copying — the agent config file does not do variable substitution itself:
sed 's/\${environment}/dev/g' cloudwatch-agent-config.json | sudo tee /opt/aws/amazon-cloudwatch-agent/etc/config.json

sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
```

Confirm it's running:

```bash
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a status
```

The agent picks up its permissions from the IAM role you attached in A1 — if
it fails to start or can't publish metrics, that role is the first thing to check.

### B3. Verify

- Log groups `/capstone/dev/{app,access,auth,ssh}` should show new log streams
  within a couple of minutes of the app + traffic generator running.
- The dashboard (see the `dashboard_url` Terraform output) should show live
  CPU/memory/disk and the failed-login / 5xx widgets populating.
- Trigger a test alarm by temporarily lowering `failed_login_alarm_threshold`
  and letting the traffic generator's brute-force burst run — confirms the
  SNS email actually arrives before day 1 ends, not on the day you need it.

---

## Notes for the Security track

The IAM role and security group here were created by hand in the console,
not generated from a template — review them as you would in a real audit:

- Does the IAM role (`capstone-dev-ec2-role`) actually stick to the two
  policies in A1, or did something broader get attached along the way?
- Is the security group's SSH rule scoped to a specific IP, or left open to
  `0.0.0.0/0`?
- Was SSM Session Manager used instead of SSH at all? If not, is that a
  recommendation worth making?

This is arguably a more realistic finding than reviewing a Terraform file —
in most orgs, at least some IAM/security-group drift comes from exactly this
kind of manual console work, not from code.
