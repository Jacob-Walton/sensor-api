use aws_lambda_events::apigw::{ApiGatewayProxyRequest, ApiGatewayProxyResponse};
use aws_lambda_events::encodings::Body;
use aws_lambda_events::http::HeaderMap;
use aws_sdk_dynamodb::{types::AttributeValue, Client};
use aws_config::BehaviorVersion;
use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use serde::{Deserialize, Serialize};
use std::env;

#[derive(Debug, Serialize, Deserialize)]
struct Reading {
    #[serde(rename = "sensorId")]
    sensor_id: String,
    timestamp: i64,
    temperature: f64,
    humidity: f64,
    pressure: f64,
    gas_resistance: f64,
    received_at: String,
}

#[derive(Serialize)]
struct Response {
    readings: Vec<Reading>,
    count: usize,
}

async fn function_handler(
    event: LambdaEvent<ApiGatewayProxyRequest>,
) -> Result<ApiGatewayProxyResponse, Error> {
    let table_name = env::var("TABLE_NAME")?;
    
    // Get limit from query params
    let limit = event
        .payload
        .query_string_parameters
        .first("limit")
        .and_then(|l| l.parse::<i32>().ok())
        .unwrap_or(100)
        .min(1000);
    
    // Create DynamoDB client
    let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let client = Client::new(&config);
    
    // Query readings
    let resp = client
        .query()
        .table_name(table_name)
        .key_condition_expression("sensorId = :sid")
        .expression_attribute_values(":sid", AttributeValue::S("sensor-1".to_string()))
        .scan_index_forward(false) // Most recent first
        .limit(limit)
        .send()
        .await?;
    
    let mut readings = Vec::new();
    if let Some(items) = resp.items {
        for item in items {
            readings.push(Reading {
                sensor_id: item.get("sensorId")
                    .and_then(|v| v.as_s().ok())
                    .unwrap_or(&String::new())
                    .clone(),
                timestamp: item.get("timestamp")
                    .and_then(|v| v.as_n().ok())
                    .and_then(|n| n.parse().ok())
                    .unwrap_or(0),
                temperature: item.get("temperature")
                    .and_then(|v| v.as_n().ok())
                    .and_then(|n| n.parse().ok())
                    .unwrap_or(0.0),
                humidity: item.get("humidity")
                    .and_then(|v| v.as_n().ok())
                    .and_then(|n| n.parse().ok())
                    .unwrap_or(0.0),
                pressure: item.get("pressure")
                    .and_then(|v| v.as_n().ok())
                    .and_then(|n| n.parse().ok())
                    .unwrap_or(0.0),
                gas_resistance: item.get("gas_resistance")
                    .and_then(|v| v.as_n().ok())
                    .and_then(|n| n.parse().ok())
                    .unwrap_or(0.0),
                received_at: item.get("received_at")
                    .and_then(|v| v.as_s().ok())
                    .unwrap_or(&String::new())
                    .clone(),
            });
        }
    }
    
    let response = Response {
        count: readings.len(),
        readings,
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