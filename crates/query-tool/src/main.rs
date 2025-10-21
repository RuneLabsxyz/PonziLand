use std::str::FromStr;
use sqlx::{postgres::PgConnectOptions, ConnectOptions, Connection, Row};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Connect to the database
    let connection = if let Ok(url) = std::env::var("DATABASE_URL") {
        PgConnectOptions::from_str(&url).expect("Invalid database url!")
    } else {
        PgConnectOptions::new()
    };

    let mut connection = connection
        .application_name("event-comparison-query")
        .connect()
        .await
        .expect("Expected connection to work");

    println!("=== EVENT LEVEL COMPARISON ===\n");

    // Query 1: Check main event table for different event types
    println!("Events by type in main 'event' table:");
    let event_types_query = "
        SELECT event_type, COUNT(*) as count 
        FROM event 
        GROUP BY event_type 
        ORDER BY count DESC
    ";
    
    let event_type_rows = sqlx::query(event_types_query)
        .fetch_all(&mut connection)
        .await?;

    for row in event_type_rows {
        let event_type: String = row.get("event_type");
        let count: i64 = row.get("count");
        println!("  {}: {}", event_type, count);
    }

    // Query 2: Check specific event tables
    println!("\n=== SPECIFIC EVENT TABLES ===");
    
    // LandBought events
    let land_bought_count = sqlx::query("SELECT COUNT(*) as count FROM event_land_bought")
        .fetch_one(&mut connection)
        .await?;
    let land_bought: i64 = land_bought_count.get("count");
    println!("LandBought events in event_land_bought table: {}", land_bought);

    // LandTransfer events  
    let land_transfer_count = sqlx::query("SELECT COUNT(*) as count FROM event_land_transfer")
        .fetch_one(&mut connection)
        .await?;
    let land_transfer: i64 = land_transfer_count.get("count");
    println!("LandTransfer events in event_land_transfer table: {}", land_transfer);

    // Query 3: Check if LandTransfer events exist in main event table but not in specific table
    println!("\n=== CROSS-REFERENCE ANALYSIS ===");
    
    let land_transfer_main_count = sqlx::query(
        "SELECT COUNT(*) as count FROM event WHERE event_type = 'ponzi_land-LandTransferEvent'"
    )
    .fetch_one(&mut connection)
    .await?;
    let land_transfer_main: i64 = land_transfer_main_count.get("count");
    println!("LandTransfer events in main 'event' table: {}", land_transfer_main);

    let land_bought_main_count = sqlx::query(
        "SELECT COUNT(*) as count FROM event WHERE event_type = 'ponzi_land-LandBoughtEvent'"
    )
    .fetch_one(&mut connection)
    .await?;
    let land_bought_main: i64 = land_bought_main_count.get("count");
    println!("LandBought events in main 'event' table: {}", land_bought_main);

    // Query 4: Show recent events to see if LandTransfer events are being created at all
    println!("\n=== RECENT EVENTS (Last 10) ===");
    let recent_events = sqlx::query(
        "SELECT id, event_type, at FROM event ORDER BY at DESC LIMIT 10"
    )
    .fetch_all(&mut connection)
    .await?;

    for row in recent_events {
        let id: String = row.get("id");
        let event_type: String = row.get("event_type");
        let at: chrono::NaiveDateTime = row.get("at");
        println!("  {}: {} ({})", id, event_type, at);
    }

    // Query 5: If LandTransfer events exist in main table, show some examples
    if land_transfer_main > 0 {
        println!("\n=== SAMPLE LANDTRANSFER EVENTS FROM MAIN TABLE ===");
        let sample_transfers = sqlx::query(
            "SELECT id, at FROM event WHERE event_type = 'ponzi_land-LandTransferEvent' ORDER BY at DESC LIMIT 5"
        )
        .fetch_all(&mut connection)
        .await?;

        for row in sample_transfers {
            let id: String = row.get("id");
            let at: chrono::NaiveDateTime = row.get("at");
            println!("  LandTransfer ID: {} at {}", id, at);
        }
    }

    println!("\n=== SUMMARY ===");
    println!("Main event table - LandTransfer: {}, LandBought: {}", land_transfer_main, land_bought_main);
    println!("Specific tables - LandTransfer: {}, LandBought: {}", land_transfer, land_bought);
    
    if land_transfer_main > 0 && land_transfer == 0 {
        println!("🔍 ISSUE FOUND: LandTransfer events exist in main table but NOT in specific table!");
        println!("This suggests a problem with the event data population into event_land_transfer table.");
    } else if land_transfer_main == 0 {
        println!("🔍 ISSUE FOUND: NO LandTransfer events in main event table!");
        println!("This suggests LandTransfer events are not being ingested from Torii at all.");
    } else {
        println!("✅ LandTransfer events appear to be working correctly.");
    }

    Ok(())
}