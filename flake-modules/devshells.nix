{inputs, ...}: {
  perSystem = {
    config,
    pkgs,
    lib,
    system,
    ...
  }: let
    cairo-nix = inputs.cairo-nix.packages.${system};
  in {
    devShells.default = pkgs.mkShell {
      packages = with pkgs;
        [
          # Git and basic tools
          git
          jq
          bc
          colorized-logs
          graphite-cli
          just

          # svelte node dependencies
          bun
          nodejs_latest

          # Cargo dependencies
          (fenix.stable.withComponents [
            "cargo"
            "clippy"
            "rust-src"
            "rustc"
            "rustfmt"
            "rust-analyzer"
          ])
          openssl
          # Hardware wallet support
          node-gyp

          # Protobuf for torii
          protobuf

          # Database tools
          postgres-lsp
          cargo-nextest
          sqlx-cli

          # Process compose for database management
          config.packages.dev
        ]
        ++ lib.optionals (system == "x86_64-linux") (with pkgs; [
          systemd
          udev
          libusb1
          pkgs.stdenv.cc.cc

          pkg-config

          gcc

          # Cairo/Starknet tools (linux only atm)
          cairo-nix.dojo
          cairo-nix.scarb-nightly
          cairo-nix.starkli
          cairo-nix.slot
        ]);

      env = {
        LD_LIBRARY_PATH = lib.makeLibraryPath ([
            pkgs.stdenv.cc.cc.lib
            pkgs.openssl
          ]
          ++ lib.optionals (system == "x86_64-linux") [
            pkgs.glibc
            pkgs.libgccjit
            pkgs.udev
          ]);
      };

      shellHook = let
        patchWorkerd = lib.optionalString (system == "x86_64-linux") ''
          # Patch workerd binary if it exists
          if [ -f "./client/node_modules/@cloudflare/workerd-linux-64/bin/workerd" ]; then
            echo "Patching workerd binary"
            ${pkgs.patchelf}/bin/patchelf \
              --set-interpreter "${pkgs.stdenv.cc.bintools.dynamicLinker}" \
              --set-rpath "${lib.makeLibraryPath [pkgs.stdenv.cc.cc.lib pkgs.glibc pkgs.libgccjit]}" \
              ./client/node_modules/@cloudflare/workerd-linux-64/bin/workerd
          fi
        '';
      in ''
        # Database configuration (skipping postgres service setup as requested)
        export DATABASE_URL="postgres://chaindata:chaindata@localhost/chaindata"
        export PGDATABASE=chaindata

        ${patchWorkerd}

        echo "🎮 PonziLand development environment loaded!"
        echo "📁 Database URL: $DATABASE_URL"
        echo "🔧 Available tools: dojo, scarb, starkli, slot, cargo-nextest, sqlx-cli"
        echo "📜 Scripts: nix run .#migrate, nix run .#new-migration"
        echo "🐘 Database: Run 'dev' to start PostgreSQL with process-compose"
      '';
    };
  };
}
