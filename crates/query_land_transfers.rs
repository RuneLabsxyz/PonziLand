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
        .application_name("land-transfer-query")
        .connect()
        .await
        .expect("Expected connection to work");

    println!("Connected to database, querying LandTransfer events...\n");

    // Query 1: Count of LandTransfer events
    let count_result = sqlx::query("SELECT COUNT(*) as count FROM event_land_transfer")
        .fetch_one(&mut connection)
        .await?;
    
    let count: i64 = count_result.get("count");
    println!("Total LandTransfer events: {}", count);

    if count > 0 {
        // Query 2: Show first 10 LandTransfer events
        println!("\nFirst 10 LandTransfer events:");
        let rows = sqlx::query("SELECT * FROM event_land_transfer ORDER BY id LIMIT 10")
            .fetch_all(&mut connection)
            .await?;

        for row in rows {
            let id: String = row.get("id");
            let from_location: i32 = row.get("from_location");
            let to_location: i32 = row.get("to_location");
            let token_address: String = row.get("token_address");
            let amount: String = row.get("amount");
            
            println!("  ID: {}, From: {}, To: {}, Token: {}, Amount: {}", 
                id, from_location, to_location, token_address, amount);
        }

        // Query 3: Show unique locations in LandTransfer events
        println!("\nUnique locations in LandTransfer events:");
        let location_rows = sqlx::query(
            "SELECT DISTINCT from_location as loc FROM event_land_transfer 
             UNION 
             SELECT DISTINCT to_location as loc FROM event_land_transfer 
             ORDER BY loc LIMIT 20"
        )
        .fetch_all(&mut connection)
        .await?;

        for row in location_rows {
            let location: i32 = row.get("loc");
            println!("  Location: {}", location);
        }
    }

    // Query 4: Count of SimplePositions
    let positions_count_result = sqlx::query("SELECT COUNT(*) as count FROM simple_positions")
        .fetch_one(&mut connection)
        .await?;
    
    let positions_count: i64 = positions_count_result.get("count");
    println!("\nTotal SimplePositions: {}", positions_count);

    if positions_count > 0 {
        // Query 5: Show some SimplePosition locations for comparison
        println!("\nFirst 10 SimplePosition locations:");
        let position_rows = sqlx::query("SELECT id, land_location, owner, close_date FROM simple_positions ORDER BY time_bought LIMIT 10")
            .fetch_all(&mut connection)
            .await?;

        for row in position_rows {
            let id: String = row.get("id");
            let land_location: i32 = row.get("land_location");
            let owner: String = row.get("owner");
            let close_date: Option<chrono::NaiveDateTime> = row.get("close_date");
            let status = if close_date.is_some() { "CLOSED" } else { "OPEN" };
            
            println!("  ID: {}, Location: {}, Owner: {}..., Status: {}", 
                id, land_location, &owner[..10], status);
        }

        // Query 6: Check for overlap between LandTransfer locations and open SimplePosition locations
        println!("\nChecking for overlapping locations between open positions and transfers:");
        let overlap_query = "
            SELECT sp.land_location, COUNT(DISTINCT sp.id) as open_positions,
                   COUNT(DISTINCT lt.id) as transfer_events
            FROM simple_positions sp
            LEFT JOIN event_land_transfer lt ON (sp.land_location = lt.from_location OR sp.land_location = lt.to_location)
            WHERE sp.close_date IS NULL
            GROUP BY sp.land_location
            HAVING COUNT(DISTINCT lt.id) > 0
            ORDER BY transfer_events DESC
            LIMIT 10
        ";
        
        let overlap_rows = sqlx::query(overlap_query)
            .fetch_all(&mut connection)
            .await?;

        if overlap_rows.is_empty() {
            println!("  No overlapping locations found between open positions and transfers!");
        } else {
            for row in overlap_rows {
                let location: i32 = row.get("land_location");
                let open_positions: i64 = row.get("open_positions");
                let transfer_events: i64 = row.get("transfer_events");
                
                println!("  Location {}: {} open positions, {} transfer events", 
                    location, open_positions, transfer_events);
            }
        }
    }

    Ok(())
}