{
  pkgs,
  lib,
  config,
  inputs,
  system,
  ...
}: let
  system = pkgs.stdenv.system;
  cairo-nix = inputs.cairo-nix.packages.${system};
in {
  packages = with pkgs; [
    git
    cairo-nix.dojo
    cairo-nix.scarb
    cairo-nix.starkli
    cairo-nix.slot
    jq
    bc
    colorized-logs
    openssl

    graphite-cli

    # Utilities
    just

    # Cargo dependencies
    pkg-config

    # Depdencies for ledger interconnection
    node-gyp
    systemd
    udev
    libusb1
    pkgs.stdenv.cc.cc

    # Required for torii compilation
    protobuf

    # Postgres language server
    postgres-lsp

    # Faster test pattern
    cargo-nextest
    sqlx-cli
  ];
  env = {
    LD_LIBRARY_PATH = lib.makeLibraryPath config.packages;
  };

  enterShell = ''
    export DB_HOST=$(printf %s "$PGHOST" | jq -sRr @uri)
    export DATABASE_URL="postgres://$DBHOST/chaindata"
    export PGDATABASE=chaindata
  '';

  scripts.migrate.exec = ''
    set -e
    cd $DEVENV_ROOT/crates/chaindata/migration
    cargo run
    cd $DEVENV_ROOT/crates/chaindata/entity
    sea-orm-cli generate entity -o ./src/entities --database-url $DATABASE_URL

    echo "Generated files!"
  '';

  scripts.new-migration.exec = ''
    if [ "$#" -ne 1 ]; then
        echo "$0 <migration_name>"
        exit 1
    fi

    cd crates/migrations
    cargo run -- add $1
  '';

  # Enable devcontainer for remote coding
  devcontainer.enable = true;

  languages.javascript = {
    enable = true;
    bun.enable = true;
  };

  languages.rust = {
    enable = true;
    mold.enable = true;
  };

  services.postgres = {
    enable = true;
    initialDatabases = [
      {
        name = "chaindata";
        user = "chaindata";
        pass = "chaindata";
      }
    ];
  };

  cachix = {
    enable = true;
    pull = ["dojo-nix"];
  };
}
