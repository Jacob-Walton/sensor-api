# Build script for Rust lambdas
resource "null_resource" "build_rust_lambdas" {
  triggers = {
    submit_reading_hash = filebase64sha256("${path.module}/../lambda/submit_reading/src/main.rs")
    get_readings_hash   = filebase64sha256("${path.module}/../lambda/get_readings/src/main.rs")
    cleanup_old_hash    = filebase64sha256("${path.module}/../lambda/cleanup_old/src/main.rs")
  }
  
  provisioner "local-exec" {
    command = "cd ${path.module}/.. && ./build.sh"
  }
}

# Submit Reading Lambda
resource "aws_lambda_function" "submit_reading" {
  depends_on = [null_resource.build_rust_lambdas]
  
  filename         = "${path.module}/../lambda/target/lambda/submit_reading/bootstrap.zip"
  function_name    = "sensor-submit-reading"
  role            = aws_iam_role.lambda_exec.arn
  handler         = "bootstrap"
  runtime         = "provided.al2023"
  architectures   = ["arm64"]
  timeout         = 10
  memory_size     = 128
  
  environment {
    variables = {
      TABLE_NAME   = aws_dynamodb_table.sensor_readings.name
      API_KEY      = var.api_key
      MAX_READINGS = var.max_readings
    }
  }
  
  tags = {
    Environment = var.environment
  }
}

# Get Readings Lambda
resource "aws_lambda_function" "get_readings" {
  depends_on = [null_resource.build_rust_lambdas]
  
  filename         = "${path.module}/../lambda/target/lambda/get_readings/bootstrap.zip"
  function_name    = "sensor-get-readings"
  role            = aws_iam_role.lambda_exec.arn
  handler         = "bootstrap"
  runtime         = "provided.al2023"
  architectures   = ["arm64"]
  timeout         = 10
  memory_size     = 128
  
  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.sensor_readings.name
    }
  }
  
  tags = {
    Environment = var.environment
  }
}

# Cleanup Lambda
resource "aws_lambda_function" "cleanup_old" {
  depends_on = [null_resource.build_rust_lambdas]
  
  filename         = "${path.module}/../lambda/target/lambda/cleanup_old/bootstrap.zip"
  function_name    = "sensor-cleanup-old"
  role            = aws_iam_role.lambda_exec.arn
  handler         = "bootstrap"
  runtime         = "provided.al2023"
  architectures   = ["arm64"]
  timeout         = 30
  memory_size     = 128
  
  environment {
    variables = {
      TABLE_NAME   = aws_dynamodb_table.sensor_readings.name
      MAX_READINGS = var.max_readings
    }
  }
  
  tags = {
    Environment = var.environment
  }
}

resource "aws_cloudwatch_event_rule" "cleanup_schedule" {
  name                = "sensor-cleanup-schedule"
  description         = "Trigger cleanup of old sensor readings"
  schedule_expression = "rate(1 hour)"
}

resource "aws_cloudwatch_event_target" "cleanup_target" {
  rule      = aws_cloudwatch_event_rule.cleanup_schedule.name
  target_id = "CleanupLambdaTarget"
  arn       = aws_lambda_function.cleanup_old.arn
}

resource "aws_lambda_permission" "allow_cloudwatch_cleanup" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cleanup_old.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.cleanup_schedule.arn
}