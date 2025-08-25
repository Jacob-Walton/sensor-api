variable "aws_region" {
  description = "AWS region for deployment"
  default     = "eu-west-2"  # London region
}

variable "environment" {
  description = "Environment name"
  default     = "production"
}

variable "max_readings" {
  description = "Maximum number of readings to retain"
  default     = 1000
}

variable "api_key" {
  description = "API key for sensor authentication"
  sensitive   = true
  type        = string
}