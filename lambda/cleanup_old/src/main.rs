use aws_config::BehaviorVersion;
use aws_lambda_events::eventbridge::EventBridgeEvent;
use aws_sdk_dynamodb::{types::AttributeValue, Client};
use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use serde_json::Value;
use std::collections::HashMap;
use std::env;
use tracing::info;

async fn function_handler(
    _event: LambdaEvent<EventBridgeEvent<Value>>,
) -> Result<String, Error> {
    let table_name = env::var("TABLE_NAME")?;
    let max_readings = env::var("MAX_READINGS")?.parse::<i32>()?;
    
    info!("Starting cleanup. Max readings allowed: {}", max_readings);
    
    // Create DynamoDB client
    let config = aws_config::load_defaults(BehaviorVersion::latest()).await;
    let client = Client::new(&config);
    
    // Query all readings for sensor-1
    let resp = client
        .query()
        .table_name(&table_name)
        .key_condition_expression("sensorId = :sid")
        .expression_attribute_values(":sid", AttributeValue::S("sensor-1".to_string()))
        .scan_index_forward(false) // Most recent first
        .send()
        .await?;
    
    let items = resp.items.unwrap_or_default();
    let total_count = items.len();
    
    info!("Found {} total readings", total_count);
    
    if total_count > max_readings as usize {
        let to_delete_count = total_count - max_readings as usize;
        info!("Need to delete {} old readings", to_delete_count);
        
        // Get the items to delete (oldest ones)
        let items_to_delete = &items[max_readings as usize..];
        
        // Batch delete in groups of 25 (DynamoDB limit)
        for chunk in items_to_delete.chunks(25) {
            let mut delete_requests = Vec::new();
            
            for item in chunk {
                let mut key = HashMap::new();
                
                // Get the keys for deletion
                if let Some(sensor_id) = item.get("sensorId") {
                    key.insert("sensorId".to_string(), sensor_id.clone());
                }
                if let Some(timestamp) = item.get("timestamp") {
                    key.insert("timestamp".to_string(), timestamp.clone());
                }
                
                if key.len() == 2 {
                    delete_requests.push(
                        aws_sdk_dynamodb::types::WriteRequest::builder()
                            .delete_request(
                                aws_sdk_dynamodb::types::DeleteRequest::builder()
                                    .set_key(Some(key))
                                    .build()
                                    .unwrap()
                            )
                            .build()
                    );
                }
            }
            
            if !delete_requests.is_empty() {
                // Execute batch delete
                client
                    .batch_write_item()
                    .request_items(&table_name, delete_requests)
                    .send()
                    .await?;
                
                info!("Deleted batch of {} items", chunk.len());
            }
        }
        
        Ok(format!("Cleanup complete. Deleted {} old readings. {} readings remain.", 
                   to_delete_count, max_readings))
    } else {
        Ok(format!("No cleanup needed. Current count: {}", total_count))
    }
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