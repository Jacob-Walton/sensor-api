use aws_lambda_events::apigw::{ApiGatewayProxyRequest, ApiGatewayProxyResponse};
use aws_lambda_events::encodings::Body;
use aws_lambda_events::http::HeaderMap;
use aws_sdk_dynamodb::{types::AttributeValue, Client};
use aws_config::BehaviorVersion;
use chrono::Utc;
use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;

#[derive(Debug, Serialize, Deserialize)]
struct SensorReading {
    temperature: f64,
    humidity: f64,
    pressure: f64,
    gas_resistance: f64,
}

#[derive(Serialize)]
struct Response {
    success: bool,
    timestamp: i64,
}

async fn function_handler(
    event: LambdaEvent<ApiGatewayProxyRequest>,
) -> Result<ApiGatewayProxyResponse, Error> {
    let api_key = env::var("API_KEY")?;
    let table_name = env::var("TABLE_NAME")?;

    // Check API key
    let headers = &event.payload.headers;
    if headers.get("x-api-key").map(|v| v.to_str().unwrap_or("")) != Some(&api_key) {
        return Ok(ApiGatewayProxyResponse {
            status_code: 401,
            headers: HeaderMap::new(),
            body: Some(Body::Text(r#"{"error":"Unauthorized"}"#.to_string())),
            ..Default::default()
        });
    }

    // Parse request body
    let body = event.payload.body.as_deref().unwrap_or("{}");
    let reading: SensorReading = serde_json::from_str(body)?;

    // Create DynamoDB client
    let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let client = Client::new(&config);

    let timestamp = Utc::now().timestamp_millis();
    let ttl = (timestamp / 1000) + (7 * 24 * 60 * 60); // 7 days TTL

    // Prepare item
    let mut item = HashMap::new();
    item.insert("sensorId".to_string(), AttributeValue::S("sensor-1".to_string()));
    item.insert("timestamp".to_string(), AttributeValue::N(timestamp.to_string()));
    item.insert("temperature".to_string(), AttributeValue::N(reading.temperature.to_string()));
    item.insert("humidity".to_string(), AttributeValue::N(reading.humidity.to_string()));
    item.insert("pressure".to_string(), AttributeValue::N(reading.pressure.to_string()));
    item.insert("gas_resistance".to_string(), AttributeValue::N(reading.gas_resistance.to_string()));
    item.insert("received_at".to_string(), AttributeValue::S(Utc::now().to_rfc3339()));
    item.insert("ttl".to_string(), AttributeValue::N(ttl.to_string()));

    // Store in DynamoDB
    client
        .put_item()
        .table_name(table_name)
        .set_item(Some(item))
        .send()
        .await?;
    
    let response = Response {
        success: true,
        timestamp,
    };
    
    Ok(ApiGatewayProxyResponse {
        status_code: 200,
        headers: HeaderMap::new(),
        body: Some(Body::Text(serde_json::to_string(&response)?)),
        ..Default::default()
    })
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_env_filter("info")
        .with_target(false)
        .without_time()
        .init();
    
    run(service_fn(function_handler)).await
}