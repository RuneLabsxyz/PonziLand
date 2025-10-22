use confique::Config;
use ekubo::Felt;
use serde::Deserialize;
use url::Url;

#[derive(Config, Debug, Clone)]
pub struct Conf {
    /// The port to listen on.
    #[config(default = 3031, env = "PORT")]
    pub port: u16,

    /// The address to listen on.
    #[config(default = "0.0.0.0", env = "LISTEN_ADDRESS")]
    pub address: String,

    #[config(default = [], env = "CORS_ORIGINS")]
    pub cors_origins: Vec<String>,

    /// The port to listen on for monitoring.
    #[config(nested)]
    pub monitoring: Monitoring,

    #[config(default = [])]
    pub token: Vec<Token>,

    #[config(nested)]
    pub ekubo: EkuboConfig,

    #[config(nested)]
    pub avnu: AvnuConfig,

    #[config(nested)]
    pub starknet: RpcConfig,

    #[config(nested)]
    pub torii: ToriiConfig,

    #[config(nested)]
    pub database: DatabaseConfig,

    pub default_token: String,
}

#[derive(Deserialize, Debug, Clone)]
pub struct Token {
    pub symbol: String,
    pub address: Felt,
}

#[derive(Config, Debug, Clone)]
pub struct ToriiConfig {
    #[config(env = "WORLD_ADDRESS")]
    pub world_address: Felt,
    #[config(env = "TORII_URL")]
    pub torii_url: Url,
}

#[derive(Config, Debug, Clone)]
pub struct DatabaseConfig {
    #[config(env = "DATABASE_URL")]
    pub url: Url,
}

#[derive(Config, Debug, Clone)]
pub struct EkuboConfig {
    #[config(env = "EKUBO_API_ADDRESS")]
    pub api_url: Url,
    #[config(env = "EKUBO_CORE_CONTRACT_ADDRESS")]
    pub core_contract_address: Felt,
}

#[derive(Config, Debug, Clone)]
pub struct AvnuConfig {
    #[config(env = "AVNU_API_URL", default = "https://starknet.impulse.avnu.fi")]
    pub api_url: String,
}

#[derive(Config, Debug, Clone)]
pub struct RpcConfig {
    #[config(env = "RPC_URL")]
    pub rpc_url: Url,
}

#[derive(Config, Debug, Clone)]
pub struct Monitoring {
    /// Whether monitoring is enabled or not
    #[config(default = true, env = "MONITORING")]
    pub enabled: bool,

    /// The address to listen on.
    #[config(default = "0.0.0.0", env = "LISTEN_ADDRESS")]
    pub address: String,

    /// The port to listen on for monitoring.
    ///
    /// Must be different from the port used for the web server.
    #[config(default = 9090, env = "MONITORING_PORT")]
    pub port: u16,

    /// The path to listen on for monitoring.
    #[config(default = "/metrics", env = "MONITORING_PATH")]
    pub path: String,
}
