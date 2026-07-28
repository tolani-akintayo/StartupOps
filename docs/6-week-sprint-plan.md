# Cross-Functional Capstone: 6-Week Sprint Plan

**Teams:** DevOps · Cybersecurity · Data Analysis
**Shared system:** `startup-capstone-api` (see `app/README.md`)
**Format:** Agile, 1-week sprints, six sprints total

**A note on Terraform:** it's reserved for the advanced curriculum, so it
appears in exactly one place in this project standing up the CloudWatch
observability layer in Week 2. Compute and networking (VPC, EC2, security
group, IAM role) are provisioned by hand through the AWS Console instead,
because that hands-on work is where the actual beginner learning objectives
live. Students run the provided Terraform, they don't author or edit it. See
`infrastructure/README.md` for the full split.

---

## Cadence (applies every week unless noted)

| Ceremony | Frequency | Length | Purpose |
|---|---|---|---|
| Standup | Mon/Wed/Fri (async okay) | 10 min | Blockers, cross-team dependencies |
| Sprint planning | Monday | 30 min | Confirm week's backlog per track |
| Sprint review/demo | Friday | 30–45 min | Show working output, not slides |
| Retro | Weeks 3 and 6 | 30 min | What's working, what's not, adjust |

Cross-team dependencies get flagged at standup, not discovered at Friday demo.

---

## Dependency map

- **Security** cannot start real investigation work until **DevOps** has the
  app deployed and traffic flowing (end of Week 2).
- **Data** cannot build real dashboards until **DevOps** has CloudWatch
  logs/metrics flowing (end of Week 2) Week 1 is prep/tooling only for them.
- **Data**'s anomaly-detection work in Week 4 depends on **Security** having
  identified and documented what "suspicious" looks like in the auth logs.
- **DevOps**'s Week 4 incident-response exercise should be scheduled so
  **Data** can analyze the resulting metrics afterward, not simultaneously.
- The CloudWatch Terraform step needs an EC2 instance ID as input; sequence
  Week 2 so the manual console provisioning happens first, Terraform second.

---

## Week 1: Kickoff, Access, and Planning

**Goal:** Everyone understands the system, has the access they need, and has a Week 2 backlog.

- **All teams:** Read `app/README.md` (skip the instructor-notes section for
  Security that's meant to be discovered, not read). Set up shared repo
  access, communication channel, and AWS IAM users/roles.
- **DevOps:** Get the app running locally in Docker. Draft the deployment plan
  (EC2 sizing, security group rules, IAM role/policies, how the traffic
  generator will run) this is a manual AWS Console plan, not a Terraform
  plan; see `infrastructure/README.md` Part A. Request AWS access needed for
  Week 2.
- **Cybersecurity:** No system to test yet instead, do a **paper threat
  model** of the architecture as described (what could go wrong in an API +
  EC2 + CloudWatch setup, in general terms). Get scanning tools (Trivy) ready.
- **Data Analysis:** No real data yet instead, define the questions you want
  the data to answer (e.g., peak usage windows, error trends, what a
  brute-force pattern would look like in access/auth logs). Get CloudWatch
  Logs Insights / export tooling ready.

**Friday deliverable:** Each track presents its Week 2 backlog and any
cross-team asks (e.g., Security requesting specific log fields from DevOps).

---

## Week 2: Deploy and Instrument

**Goal:** The system is live, traffic is flowing, and logs/metrics reach CloudWatch.

- **DevOps:** Provision the VPC (default), security group, IAM role, and EC2
  instance by hand through the AWS Console full steps in
  `infrastructure/README.md` Part A. Deploy the app to EC2 via Docker. Start
  the traffic generator (systemd, per `traffic-generator/README.md`). Then,
  and only then, run the provided CloudWatch Terraform
  (`infrastructure/terraform` Part B) to stand up log groups, alarms, and the
  dashboard; treat this as running a provided tool, not authoring IaC;
  confirm the agent is shipping logs and the dashboard shows live data.
- **Cybersecurity:** Harden the EC2 host; SSH key-only auth (or confirm SSM
  Session Manager is in use instead), disable root login, restrict the
  security group to necessary ports. Review the IAM role and security group
  DevOps created through the console for scope (least privilege, no `0.0.0.0/0`
  on SSH). Run a first Trivy scan against the app's dependencies.
- **Data Analysis:** Confirm you can query the new log groups via CloudWatch
  Logs Insights. Do a first exploratory pass; request volume by hour, status
  code distribution. Don't build final dashboards yet; you're validating the
  data is real and usable.

**Friday deliverable:** Live demo; app reachable, traffic generator running,
CloudWatch dashboard showing real metrics.

---

## Week 3: Investigate and Iterate

**Goal:** Security starts finding real issues; Data ships a first dashboard draft.

- **DevOps:** Add any extra alarms/dashboard widgets other tracks request
  directly through the CloudWatch console don't edit the provided Terraform
  files; that keeps the one IaC step in this project scoped to what's already
  there. Set up log rotation/retention if not already handled. Start a basic
  CI pipeline (GitHub Actions) for rebuild-and-redeploy on push. Write a
  one-page ops runbook (how to restart the app, check logs, roll back).
- **Cybersecurity:** Using auth.log and access.log (via the dashboard/Logs
  Insights, not raw file access), identify real findings; this is where the
  planted vulnerabilities should surface if the team is thorough. Document
  each finding: what it is, how it was found, severity, proposed fix.
- **Data Analysis:** Ship dashboard v1; traffic by hour/day, error rate over
  time, response time distribution. Share early observations with DevOps
  (e.g., "here's when load peaks") and Security (e.g., "here's a login
  pattern that looks abnormal").

**Friday:** Mid-project retro surface blockers early, not in Week 6.

---

## Week 4: Respond and Remediate

**Goal:** Security fixes what it found; DevOps proves it can handle an incident; Data digs deeper.

- **DevOps:** Run a scheduled "incident" e.g., temporarily throttle the
  instance or inject load and respond using the dashboard/alarms only (no
  peeking at the terminal first). Document the response as an incident
  report: detection time, diagnosis, resolution, follow-up action.
- **Cybersecurity:** Implement fixes for at least two confirmed findings from
  Week 3 (e.g., add rate limiting to `/api/auth/login`, fix the IDOR, require
  auth on the admin stats endpoint). Re-scan to confirm the dependency finding
  is resolved. Finalize the written security assessment.
- **Data Analysis:** Go deeper correlate the brute-force/suspicious traffic
  Security identified with your own traffic data. Build a business-facing
  view (simulated conversion/order trends) in addition to the ops-facing one.

**Friday deliverable:** Security presents its assessment + fixes; Data shows
the correlated security/traffic view.

---

## Week 5: Polish and Integrate

**Goal:** Everything is demo-ready and the three tracks' work visibly connects.

- **DevOps:** Finalize CI/CD, confirm the runbook is accurate, make sure
  dashboards are clean and presentable (not debug-cluttered).
- **Cybersecurity:** Finalize the written report findings, fixes, residual
  risk, recommendations for what a "next sprint" of hardening would cover.
- **Data Analysis:** Finalize dashboards and write the business recommendation
  summary (2-3 concrete, data-backed suggestions).
- **All teams:** Build one shared "State of the System" deck combining all
  three perspectives this is what gets presented in Week 6, not three
  separate decks stapled together.

**Friday deliverable:** Full dry run of the Week 6 final presentation.

---

## Week 6: Final Demo and Retrospective

**Goal:** Present the system as one team, not three.

- **Joint presentation (all tracks, one narrative):**
  1. DevOps: what was deployed, uptime/reliability story, how the incident
     was handled.
  2. Security: what was found, what was fixed, what's still open.
  3. Data: what the data showed, and what it means for the (fictional)
     business.
- **Live demo:** the running system, the dashboard, and if timed well a
  live alarm firing from the traffic generator's brute-force burst.
- **Final retro:** what each student learned about working across
  disciplines, not just their own track's technical output.

**Deliverable:** Final presentation + all written artifacts (runbook,
security report, dashboards/recommendations) submitted as the project record.

---

## What "done" looks like per track

- **DevOps:** Compute infrastructure (VPC/EC2/SG/IAM) provisioned via console,
  app deployed and stable, traffic generator running continuously, CI pipeline
  functioning, CloudWatch dashboard/alarms live (via the provided Terraform),
  runbook written.
- **Cybersecurity:** Documented findings with evidence (log excerpts, scan
  output), at least two fixes implemented and verified, written assessment.
- **Data Analysis:** Working dashboard(s) built on real CloudWatch data,
  correlated security/traffic insight, written business recommendations.
