resource "aws_api_gateway_rest_api" "sensor_api" {
  name        = "sensor-api"
  description = "API for sensor readings"
  
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# /readings resource
resource "aws_api_gateway_resource" "readings" {
  rest_api_id = aws_api_gateway_rest_api.sensor_api.id
  parent_id   = aws_api_gateway_rest_api.sensor_api.root_resource_id
  path_part   = "readings"
}

# POST /readings
resource "aws_api_gateway_method" "post_readings" {
  rest_api_id   = aws_api_gateway_rest_api.sensor_api.id
  resource_id   = aws_api_gateway_resource.readings.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "post_readings" {
  rest_api_id = aws_api_gateway_rest_api.sensor_api.id
  resource_id = aws_api_gateway_resource.readings.id
  http_method = aws_api_gateway_method.post_readings.http_method
  
  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.submit_reading.invoke_arn
}

# GET /readings
resource "aws_api_gateway_method" "get_readings" {
  rest_api_id   = aws_api_gateway_rest_api.sensor_api.id
  resource_id   = aws_api_gateway_resource.readings.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "get_readings" {
  rest_api_id = aws_api_gateway_rest_api.sensor_api.id
  resource_id = aws_api_gateway_resource.readings.id
  http_method = aws_api_gateway_method.get_readings.http_method
  
  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.get_readings.invoke_arn
}

# Lambda permissions for API Gateway
resource "aws_lambda_permission" "api_gateway_submit" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.submit_reading.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.sensor_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gateway_get" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_readings.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.sensor_api.execution_arn}/*/*"
}

# Deploy API
resource "aws_api_gateway_deployment" "sensor_api" {
  depends_on = [
    aws_api_gateway_integration.post_readings,
    aws_api_gateway_integration.get_readings,
  ]
  
  rest_api_id = aws_api_gateway_rest_api.sensor_api.id
}

resource "aws_api_gateway_stage" "sensor_api" {
  deployment_id = aws_api_gateway_deployment.sensor_api.id
  rest_api_id   = aws_api_gateway_rest_api.sensor_api.id
  stage_name    = var.environment
}

# CORS configuration
resource "aws_api_gateway_method" "options_readings" {
  rest_api_id   = aws_api_gateway_rest_api.sensor_api.id
  resource_id   = aws_api_gateway_resource.readings.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options_readings" {
  rest_api_id = aws_api_gateway_rest_api.sensor_api.id
  resource_id = aws_api_gateway_resource.readings.id
  http_method = aws_api_gateway_method.options_readings.http_method
  type        = "MOCK"
  
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options_readings" {
  rest_api_id = aws_api_gateway_rest_api.sensor_api.id
  resource_id = aws_api_gateway_resource.readings.id
  http_method = aws_api_gateway_method.options_readings.http_method
  status_code = "200"
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "options_readings" {
  rest_api_id = aws_api_gateway_rest_api.sensor_api.id
  resource_id = aws_api_gateway_resource.readings.id
  http_method = aws_api_gateway_method.options_readings.http_method
  status_code = aws_api_gateway_method_response.options_readings.status_code
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS,POST'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}