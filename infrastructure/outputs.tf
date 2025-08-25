output "api_endpoint" {
  value       = aws_api_gateway_deployment.sensor_api.invoke_url
  description = "API Gateway endpoint URL"
}

output "table_name" {
  value       = aws_dynamodb_table.sensor_readings.name
  description = "DynamoDB table name"
}