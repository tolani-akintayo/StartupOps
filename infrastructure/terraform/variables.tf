variable "aws_region" {
  description = "AWS region to deploy observability resources into"
  type        = string
  default     = "us-east-2"
}

variable "environment" {
  description = "Environment name, used in log group paths and resource naming (e.g. dev, staging)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project tag applied to all resources"
  type        = string
  default     = "startup-capstone"
}

variable "ec2_instance_id" {
  description = "Instance ID of the EC2 host running the app + traffic generator. Provisioned manually via the AWS Console by the DevOps track — see infrastructure/README.md Part A. This Terraform does not create the instance, it only wires up observability against it."
  type        = string
}

variable "log_retention_days" {
  description = "Retention period for all capstone CloudWatch log groups"
  type        = number
  default     = 60
}

variable "alarm_email" {
  description = "Email address to notify when alarms trigger"
  type        = string
}

variable "failed_login_alarm_threshold" {
  description = "Number of failed logins within the evaluation window that triggers the brute-force alarm"
  type        = number
  default     = 10
}

variable "error_rate_alarm_threshold" {
  description = "Number of 5xx responses within the evaluation window that triggers the error-rate alarm"
  type        = number
  default     = 15
}

variable "cpu_alarm_threshold" {
  description = "CPU utilization percentage that triggers the high-CPU alarm"
  type        = number
  default     = 80
}

variable "disk_alarm_threshold" {
  description = "Disk used percentage that triggers the low-disk-space alarm"
  type        = number
  default     = 85
}
