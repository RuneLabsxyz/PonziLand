use confique::Config;

#[derive(Config, Debug, Clone)]
pub struct Conf {
    /// The port to listen on.
    #[config(default = 3031, env = "PORT")]
    pub port: u16,

    /// The address to listen on.
    #[config(default = "0.0.0.0", env = "LISTEN_ADDRESS")]
    pub address: String,

    /// The port to listen on for monitoring.
    #[config(nested)]
    pub monitoring: Monitoring,
}

#[derive(Config, Debug, Clone)]
pub struct Monitoring {
    /// Whether monitoring is enabled or not
    #[config(default = true, env = "MONITORING")]
    pub enabled: bool,
    /// The port to listen on for monitoring.
    ///
    /// Must be different from the port used for the web server.
    #[config(default = 9090, env = "MONITORING_PORT")]
    pub port: u16,

    /// The path to listen on for monitoring.
    #[config(default = "/metrics", env = "MONITORING_PATH")]
    pub path: String,
}
