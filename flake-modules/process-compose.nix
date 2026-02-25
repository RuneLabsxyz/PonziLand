{inputs, ...}: let
  # Read ports from environment variables (requires --impure flag)
  pgPort = builtins.getEnv "PONZILAND_PG_PORT";
  pgadminPort = builtins.getEnv "PONZILAND_PGADMIN_PORT";
  vitePort = builtins.getEnv "PONZILAND_VITE_PORT";
  pgPortNum = if pgPort == "" then 5432 else builtins.fromJSON pgPort;
  pgadminPortNum = if pgadminPort == "" then 5050 else builtins.fromJSON pgadminPort;
  vitePortNum = if vitePort == "" then 5173 else builtins.fromJSON vitePort;
in {
  imports = [
    inputs.process-compose-flake.flakeModule
  ];

  perSystem = {
    config,
    lib,
    pkgs,
    ...
  }: {
    process-compose.dev = {
      imports = [
        inputs.services-flake.processComposeModules.default
      ];

      services.postgres."pg1" = {
        enable = true;
        port = pgPortNum;
        initialScript.before = ''
          CREATE USER chaindata WITH password 'chaindata';
        '';

        initialScript.after = ''
          ALTER DATABASE chaindata OWNER TO chaindata;
          GRANT ALL PRIVILEGES ON DATABASE chaindata TO chaindata;
        '';

        extensions = exts: [
          exts.system_stats
        ];

        initialDatabases = [
          {
            name = "chaindata";
          }
        ];
      };

      services.pgadmin."pgad1" = {
        enable = true;
        port = pgadminPortNum;
        initialEmail = "test@runelabs.xyz";
        initialPassword = "password";
      };

      # Create a new process after the pg has started to run the migrations
      settings.processes.migrate = {
        command = "${config.packages.migrate}/bin/migrate";
        depends_on."pg1".condition = "process_healthy";
        environment = {
          DATABASE_URL = "postgres://chaindata:chaindata@127.0.0.1:${toString pgPortNum}/chaindata";
        };
      };

      # Run indexer with cargo watch
      settings.processes.ponzidexer = {
        command = "${pkgs.cargo-watch}/bin/cargo-watch -x 'run --bin indexer'";
        working_dir = "./crates/indexer";
        depends_on.migrate.condition = "process_completed_successfully";
        environment = {
          DATABASE_URL = "postgres://chaindata:chaindata@127.0.0.1:${toString pgPortNum}/chaindata";
        };
      };

      # Run frontend in dev mode
      settings.processes.frontend-mainnet-local-api = {
        command = "${pkgs.bun}/bin/bun dev:mainnet-local-api --port ${toString vitePortNum}";
        working_dir = "./client";
      };
    };
  };
}
