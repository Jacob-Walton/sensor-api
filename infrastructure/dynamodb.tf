resource "aws_dynamodb_table" "sensor_readings" {
  name           = "sensor-readings"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "sensorId"
  range_key      = "timestamp"
  
  attribute {
    name = "sensorId"
    type = "S"
  }
  
  attribute {
    name = "timestamp"
    type = "N"
  }
  
  # TTL to auto-delete old readings
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
  
  tags = {
    Environment = var.environment
    Project     = "sensor-api"
  }
}