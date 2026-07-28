# Least-privilege role for the EC2 host: only what the CloudWatch agent needs
# to publish metrics and ship logs. This is intentionally scoped down rather
# than using a broad admin policy — a good discussion point for the Security
# track when they review IAM.

resource "aws_iam_role" "cloudwatch_agent" {
  name = "${var.project_name}-${var.environment}-cwagent-role"
  tags = local.tags

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cloudwatch_agent_policy" {
  role       = aws_iam_role.cloudwatch_agent.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# Optional but recommended: lets SSM Session Manager reach the box without an
# open SSH port at all — worth pairing with the Security track's hardening work.
resource "aws_iam_role_policy_attachment" "ssm_managed_instance" {
  role       = aws_iam_role.cloudwatch_agent.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "cloudwatch_agent" {
  name = "${var.project_name}-${var.environment}-cwagent-profile"
  role = aws_iam_role.cloudwatch_agent.name
}

output "instance_profile_name" {
  description = "Attach this instance profile to the EC2 host so it can run the CloudWatch agent"
  value       = aws_iam_instance_profile.cloudwatch_agent.name
}
