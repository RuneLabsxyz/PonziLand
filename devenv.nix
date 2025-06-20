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

    graphite-cli

    # Utilities
    just

    # Cargo dependencies
    pkg-config
    openssl
    gcc

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
  tasks = {
    "patch:deps" = {
      exec = ''
        if [ -f "./client/node_modules/@cloudflare/workerd-linux-64/bin/workerd" ]; then
          echo "Patching workerd binary"
          ${pkgs.patchelf}/bin/patchelf \
            --set-interpreter "${pkgs.stdenv.cc.bintools.dynamicLinker}" \
            --set-rpath "${lib.makeLibraryPath [pkgs.stdenv.cc.cc.lib pkgs.glibc pkgs.libgccjit]}" \
            ./client/node_modules/@cloudflare/workerd-linux-64/bin/workerd
        fi
      '';
      before = ["devenv:enterShell"];
    };
  };

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
    package = pkgs.postgresql_16;
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
