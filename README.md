# StartupOps

A lightweight startup operations platform.

# Cross-Functional Capstone — Technical Scaffold

The shared system that DevOps, Cybersecurity, and Data Analysis students
deploy, secure, monitor, and analyze together. See `docs/6-week-sprint-plan.md`
for the project structure and weekly cadence.

## Components

| Folder                | Owner (primary)        | What it is |
|------------------------|------------------------|------------|
| `app/`                 | DevOps (deploys it)    | The Node.js API — the shared system all three tracks work against |
| `traffic-generator/`   | DevOps (runs it)       | Continuously simulates realistic usage, attacks, and errors |
| `infrastructure/`      | DevOps (owns), Security (reviews) | CloudWatch agent config + Terraform for logs/metrics/alarms/dashboard |
| `docs/`                | Instructors             | Sprint plan and project structure |

## Architecture (deployed state)

```
                       ┌───────────────────────────┐
                       │       EC2 instance        │
                       │                           │
  traffic-generator ──▶  Docker: startup-capstone-  
  (systemd, continuous)│  api  ── writes logs to ──┼──▶ /var/log/app/*.log
                       │                           │             
                       │  CloudWatch Agent  ◀───────────────────┘
                       └──────────────┬────────────┘
                                      │ metrics + logs
                                      ▼
                          Amazon CloudWatch
                (Log Groups · Metric Filters · Alarms · Dashboard)

                                      │
                    ┌──────────────────────────────────┐
                    ▼                                   ▼
            Security track                        Data Analysis track
      (auth.log, ssh log, alarms,                (access.log, dashboards,
       dependency scanning)                        CloudWatch Logs Insights)
```

## Quickstart (for the DevOps track)

```bash
# 1. Build and run the app
cd app
cp .env.example .env
docker build -t startup-capstone-api .
docker run -d -p 3000:3000 -v /var/log/app:/usr/src/app/logs --env-file .env startup-capstone-api

# 2. Start the traffic generator (see traffic-generator/README.md for systemd setup)
cd ../traffic-generator
TARGET_URL=http://localhost:3000 node generator.js &

# 3. Deploy CloudWatch observability (see infrastructure/README.md)
cd ../infrastructure/terraform
terraform init && terraform apply -var="ec2_instance_id=..." -var="alarm_email=..."
```

## Important: don't fix the vulnerabilities before Security finds them

`app/README.md` documents five intentionally planted issues in the API
(hardcoded backdoor credential, no login rate limiting, an IDOR, an exposed
admin endpoint, and an outdated dependency). DevOps should deploy the app
as-is. Fixing these is Security's job in weeks 3–4 of the sprint plan — that's
the point of the exercise.
