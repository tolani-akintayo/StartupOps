# --- Log groups (must match the log_group_name values in
#     infrastructure/cloudwatch-agent-config.json, with ${environment}
#     substituted for var.environment) ---

resource "aws_cloudwatch_log_group" "app" {
  name              = "/capstone/${var.environment}/app"
  retention_in_days = var.log_retention_days
  tags              = local.tags
}

resource "aws_cloudwatch_log_group" "access" {
  name              = "/capstone/${var.environment}/access"
  retention_in_days = var.log_retention_days
  tags              = local.tags
}

resource "aws_cloudwatch_log_group" "auth" {
  name              = "/capstone/${var.environment}/auth"
  retention_in_days = var.log_retention_days
  tags              = local.tags
}

resource "aws_cloudwatch_log_group" "ssh" {
  name              = "/capstone/${var.environment}/ssh"
  retention_in_days = var.log_retention_days
  tags              = local.tags
}

# --- SNS topic for alarm notifications ---

resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-${var.environment}-alerts"
  tags = local.tags
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# --- Metric filters: turn structured log lines into countable CloudWatch metrics ---

resource "aws_cloudwatch_log_metric_filter" "failed_logins" {
  name           = "${var.project_name}-${var.environment}-failed-logins"
  log_group_name = aws_cloudwatch_log_group.auth.name
  # auth.log lines are JSON, e.g. {"event":"login_attempt","success":false,...}
  pattern = "{ $.event = \"login_attempt\" && $.success = false }"

  metric_transformation {
    name      = "FailedLoginCount"
    namespace = "CapstoneProject/Auth"
    value     = "1"
    unit      = "Count"
  }
}

resource "aws_cloudwatch_log_metric_filter" "http_5xx" {
  name           = "${var.project_name}-${var.environment}-http-5xx"
  log_group_name = aws_cloudwatch_log_group.access.name
  pattern        = "{ $.res.statusCode >= 500 }"

  metric_transformation {
    name      = "Http5xxCount"
    namespace = "CapstoneProject/App"
    value     = "1"
    unit      = "Count"
  }
}

# --- Alarms ---

resource "aws_cloudwatch_metric_alarm" "brute_force_detected" {
  alarm_name          = "${var.project_name}-${var.environment}-possible-brute-force"
  alarm_description   = "Failed login volume suggests a brute-force attempt. Check auth.log for the source IP."
  namespace           = "CapstoneProject/Auth"
  metric_name         = aws_cloudwatch_log_metric_filter.failed_logins.metric_transformation[0].name
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = var.failed_login_alarm_threshold
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  tags                = local.tags
}

resource "aws_cloudwatch_metric_alarm" "elevated_error_rate" {
  alarm_name          = "${var.project_name}-${var.environment}-elevated-5xx-rate"
  alarm_description   = "5xx response volume is above normal — check app.log and recent deploys."
  namespace           = "CapstoneProject/App"
  metric_name         = aws_cloudwatch_log_metric_filter.http_5xx.metric_transformation[0].name
  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = var.error_rate_alarm_threshold
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  tags                = local.tags
}

resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-high-cpu"
  namespace           = "AWS/EC2"
  metric_name         = "CPUUtilization"
  dimensions          = { InstanceId = var.ec2_instance_id }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  comparison_operator = "GreaterThanThreshold"
  threshold           = var.cpu_alarm_threshold
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  tags                = local.tags
}

resource "aws_cloudwatch_metric_alarm" "low_disk_space" {
  alarm_name          = "${var.project_name}-${var.environment}-low-disk-space"
  namespace           = "CapstoneProject/System"
  metric_name         = "disk_used_percent"
  dimensions          = { InstanceId = var.ec2_instance_id, path = "/" }
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  comparison_operator = "GreaterThanThreshold"
  threshold           = var.disk_alarm_threshold
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]
  tags                = local.tags
}

# --- Dashboard ---

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric", x = 0, y = 0, width = 8, height = 6,
        properties = {
          title  = "CPU Utilization"
          region = var.aws_region
          metrics = [["AWS/EC2", "CPUUtilization", "InstanceId", var.ec2_instance_id]]
          stat    = "Average"
          period  = 300
        }
      },
      {
        type = "metric", x = 8, y = 0, width = 8, height = 6,
        properties = {
          title  = "Memory Used %"
          region = var.aws_region
          metrics = [["CapstoneProject/System", "mem_used_percent", "InstanceId", var.ec2_instance_id]]
          stat    = "Average"
          period  = 300
        }
      },
      {
        type = "metric", x = 16, y = 0, width = 8, height = 6,
        properties = {
          title  = "Disk Used %"
          region = var.aws_region
          metrics = [["CapstoneProject/System", "disk_used_percent", "InstanceId", var.ec2_instance_id, "path", "/"]]
          stat    = "Average"
          period  = 300
        }
      },
      {
        type = "metric", x = 0, y = 6, width = 12, height = 6,
        properties = {
          title  = "Failed Logins (5 min sum)"
          region = var.aws_region
          metrics = [["CapstoneProject/Auth", "FailedLoginCount"]]
          stat    = "Sum"
          period  = 300
        }
      },
      {
        type = "metric", x = 12, y = 6, width = 12, height = 6,
        properties = {
          title  = "HTTP 5xx Responses (5 min sum)"
          region = var.aws_region
          metrics = [["CapstoneProject/App", "Http5xxCount"]]
          stat    = "Sum"
          period  = 300
        }
      },
      {
        type = "log", x = 0, y = 12, width = 24, height = 6,
        properties = {
          title  = "Recent Failed Logins"
          region = var.aws_region
          query  = "SOURCE '${aws_cloudwatch_log_group.auth.name}' | fields @timestamp, username, ip, reason | filter success = false | sort @timestamp desc | limit 20"
          view   = "table"
        }
      }
    ]
  })
}
