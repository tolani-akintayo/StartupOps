# Infrastructure / Observability

This layer assumes the DevOps track has already provisioned an EC2 instance
(via their own Terraform/console work) and deployed the Docker container per
`app/README.md`. This directory only covers the **CloudWatch observability
layer** — log groups, metric filters, alarms, dashboard, and the IAM role the
agent needs.

## 1. Deploy the CloudWatch layer

```bash
cd terraform
terraform init
terraform apply \
  -var="ec2_instance_id=i-0123456789abcdef0" \
  -var="alarm_email=you@example.com" \
  -var="environment=dev"
```

Attach the resulting instance profile (`instance_profile_name` output) to the
EC2 instance — either at launch or via `aws ec2 associate-iam-instance-profile`
if it's already running.

## 2. Install and configure the CloudWatch agent on the EC2 host

```bash
sudo yum install -y amazon-cloudwatch-agent   # Amazon Linux
# sudo apt-get install -y amazon-cloudwatch-agent  # Ubuntu — also switch the
# /var/log/secure path in the agent config to /var/log/auth.log

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

## 3. Verify

- Log groups `/capstone/dev/{app,access,auth,ssh}` should show new log streams
  within a couple of minutes of the app + traffic generator running.
- The dashboard (see `dashboard_url` output) should show live CPU/memory/disk
  and the failed-login / 5xx widgets populating once traffic is flowing.
- Trigger a test alarm by temporarily lowering `failed_login_alarm_threshold`
  and letting the traffic generator's brute-force burst run — confirms the
  SNS email actually arrives before day 1 ends, not on the day you need it.

## Notes for the Security track

The IAM role here (`iam.tf`) is scoped to exactly two AWS-managed policies:
`CloudWatchAgentServerPolicy` and `AmazonSSMManagedInstanceCore`. Reviewing
whether that's actually least-privilege enough — and whether SSM Session
Manager should replace SSH entirely — is a reasonable week 2–3 finding.
