{inputs, ...}: {
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
        initialEmail = "test@runelabs.xyz";
        initialPassword = "password";
      };

      # Create a new process after the pg has started to run the migrations
      settings.processes.migrate = {
        command = "${config.packages.migrate}/bin/migrate";
        depends_on."pg1".condition = "process_healthy";
        environment = {
          DATABASE_URL = "postgres://chaindata:chaindata@127.0.0.1:5432/chaindata";
        };
      };

      # Run indexer with cargo watch
      settings.processes.ponzidexer = {
        command = "${pkgs.cargo-watch}/bin/cargo-watch -x 'run --bin indexer'";
        working_dir = "./crates/indexer";
        depends_on.migrate.condition = "process_completed_successfully";
        environment = {
          DATABASE_URL = "postgres://chaindata:chaindata@127.0.0.1:5432/chaindata";
        };
      };

      # Run frontend in dev mode on Sepolia
      settings.processes.frontend-mainnet-local-api = {
        command = "${pkgs.bun}/bin/bun dev:mainnet-local-api";
        working_dir = "./client";
      };
    };
  };
}
