output "dashboard_url" {
  description = "Direct link to the CloudWatch dashboard"
  value       = "https://${var.aws_region}.console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#dashboards:name=${aws_cloudwatch_dashboard.main.dashboard_name}"
}

output "log_group_names" {
  description = "All capstone log groups, for reference by Data/Security tooling"
  value = {
    app    = aws_cloudwatch_log_group.app.name
    access = aws_cloudwatch_log_group.access.name
    auth   = aws_cloudwatch_log_group.auth.name
    ssh    = aws_cloudwatch_log_group.ssh.name
  }
}

output "sns_topic_arn" {
  description = "ARN of the alerts topic, useful if other teams want to subscribe additional endpoints (e.g. Slack via Chatbot)"
  value       = aws_sns_topic.alerts.arn
}
