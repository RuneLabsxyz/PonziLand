use std::str::FromStr;
use std::{env, fs};

use clap::{Parser, Subcommand};
use migrations::MIGRATOR;
use sqlx::{postgres::PgConnectOptions, query, ConnectOptions, Connection};
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use tracing::info;
use tracing_subscriber::filter::LevelFilter;

const MIGRATIONS_DIR: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/sql");

#[derive(Parser)]
#[command(version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Executes migrations
    Migrate {},
    Recreate {},
    /// Creates a new migration
    Add {
        name: String,
    },
}

fn database_connect_options() -> PgConnectOptions {
    match std::env::var("DATABASE_URL") {
        Ok(url) if !url.trim().is_empty() => {
            PgConnectOptions::from_str(&url).expect("Invalid database url!")
        }
        _ => PgConnectOptions::new(),
    }
}

async fn migrate() {
    // Connect to the database
    let connection = database_connect_options();

    let mut connection = connection
        .application_name("sql-migrator")
        .connect()
        .await
        .expect("Expected connection to work");

    MIGRATOR
        .run(&mut connection)
        .await
        .expect("Exception raised while migrating");

    info!("Migrated database successfully!");
}

async fn create_new_migration(name: String) {
    let current_count = MIGRATOR.iter().len();

    let name = name.replace([' ', '_'], "-").to_lowercase();

    // Create a new file in the sql directory
    let file_name = format!("{MIGRATIONS_DIR}/{:0>4}_{}.sql", current_count + 1, name);

    if !fs::exists(MIGRATIONS_DIR).unwrap_or(false) {
        println!("PWD: {:#?}", env::var("PWD"));
        panic!("No sql directory found at {MIGRATIONS_DIR}");
    }

    let mut file = File::create(&file_name)
        .await
        .expect("Error while creating migration file");

    file.write_all(
        r"-- Write your migration here!
            "
        .trim_end_matches(' ')
        .as_bytes(),
    )
    .await
    .expect("Failed to write...");

    info!("Created new migration at {file_name}!");
}

// Come on, this is a binary...
#[allow(clippy::missing_panics_doc)]
#[tokio::main]
pub async fn main() {
    tracing_subscriber::fmt::fmt()
        .with_max_level(LevelFilter::INFO)
        .init();

    let args = Cli::parse();

    match args.command {
        Commands::Migrate {} => migrate().await,
        Commands::Add { name } => create_new_migration(name).await,
        Commands::Recreate {} => recreate_database().await,
    }
}

async fn recreate_database() {
    // Connect to the database
    let options = database_connect_options().application_name("sql-migrator");
    let mut connection = options
        .connect()
        .await
        .expect("Expected connection to work");

    // Drop all tables
    {
        let mut tx = connection.begin().await.unwrap();

        query("DROP SCHEMA public CASCADE")
            .execute(&mut *tx)
            .await
            .unwrap();

        query("CREATE SCHEMA public")
            .execute(&mut *tx)
            .await
            .unwrap();

        tx.commit().await.unwrap();
    }

    // Migrate everything
    MIGRATOR
        .run(&mut connection)
        .await
        .expect("Exception raised while migrating");

    info!("Recreated database successfully!");
}
