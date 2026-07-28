# StartupOps

A lightweight startup operations platform.

# Cross-Functional Capstone — Technical Scaffold

The shared system that DevOps, Cybersecurity, and Data Analysis students
deploy, secure, monitor, and analyze together. See `docs/6-week-sprint-plan.md`
for the project structure and weekly cadence.

## A note on tooling boundaries

Terraform is reserved for the advanced curriculum, so this project uses it in
exactly one place: standing up the CloudWatch observability layer. Compute and
networking (VPC, EC2, security group, IAM role) are provisioned by hand
through the AWS Console — that's where the actual beginner learning
objectives live, and Terraform would abstract away the thing students are
supposed to be learning. See `infrastructure/README.md` for the full
rationale and step-by-step split.

## Components

| Folder                | Owner (primary)        | What it is |
|------------------------|------------------------|------------|
| `app/`                 | DevOps (deploys it)    | The Node.js API — the shared system all three tracks work against |
| `traffic-generator/`   | DevOps (runs it)       | Continuously simulates realistic usage, attacks, and errors |
| `infrastructure/`      | DevOps (owns), Security (reviews) | Part A: manual console steps for EC2/VPC/SG/IAM. Part B: provided Terraform for CloudWatch logs/metrics/alarms/dashboard only |
| `docs/`                | Instructors             | Sprint plan and project structure |

## Architecture (deployed state)

```
                       ┌──────────────────────────┐
                       │   EC2 instance           │
                       │   (provisioned manually  │
                       │    via AWS Console)      │
  traffic-generator ──▶  Docker: startup-capstone-
  (systemd, continuous)│  api  ── writes logs to ───▶ /var/log/app/*.log
                       │                          │          
                       │  CloudWatch Agent  ◀───────────────┘
                       └──────────────┬───────────┘
                                      │ metrics + logs
                                      ▼
                    Amazon CloudWatch (via Terraform, Part B)
                (Log Groups · Metric Filters · Alarms · Dashboard)
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                                     ▼
            Security track                        Data Analysis track
      (auth.log, ssh log, alarms,                (access.log, dashboards,
       dependency scanning, IAM/SG review)         CloudWatch Logs Insights)
```

## Quickstart (for the DevOps track)

```bash
# 0. Provision compute manually via AWS Console — VPC (default), security
#    group, IAM role, EC2 instance. Full click-by-click steps in
#    infrastructure/README.md Part A. Note the instance ID when done.

# 1. Build and run the app (on the EC2 instance)
cd app
cp .env.example .env
docker build -t startup-capstone-api .
docker run -d -p 3000:3000 -v /var/log/app:/usr/src/app/logs --env-file .env startup-capstone-api

# 2. Start the traffic generator (see traffic-generator/README.md for systemd setup)
cd ../traffic-generator
TARGET_URL=http://localhost:3000 node generator.js &

# 3. Deploy CloudWatch observability — this is the one Terraform step in the
#    whole project. Students run it, they don't need to author or edit it.
#    See infrastructure/README.md Part B.
cd ../infrastructure/terraform
terraform init && terraform apply -var="ec2_instance_id=<from step 0>" -var="alarm_email=..."
```

## Important: don't fix the vulnerabilities before Security finds them

`app/README.md` documents five intentionally planted issues in the API
(hardcoded backdoor credential, no login rate limiting, an IDOR, an exposed
admin endpoint, and an outdated dependency). DevOps should deploy the app
as-is. Fixing these is Security's job in weeks 3–4 of the sprint plan — that's
the point of the exercise.
