{...}: {
  perSystem = {pkgs, ...}: {
    packages = {
      migrate = pkgs.writeShellScriptBin "migrate" ''
        set -e
        # Find project root by looking for flake.nix
        project_root=$(pwd)
        while [[ "$project_root" != "/" && ! -f "$project_root/flake.nix" ]]; do
          project_root=$(dirname "$project_root")
        done
        if [[ ! -f "$project_root/flake.nix" ]]; then
          echo "Error: Could not find project root (flake.nix not found)"
          exit 1
        fi
        cd "$project_root/crates/migrations"
        cargo run -- migrate
        echo "Migrations completed!"
      '';

      new-migration = pkgs.writeShellScriptBin "new-migration" ''
        if [ "$#" -ne 1 ]; then
            echo "Usage: $0 <migration_name>"
            exit 1
        fi
        # Find project root by looking for flake.nix
        project_root=$(pwd)
        while [[ "$project_root" != "/" && ! -f "$project_root/flake.nix" ]]; do
          project_root=$(dirname "$project_root")
        done
        if [[ ! -f "$project_root/flake.nix" ]]; then
          echo "Error: Could not find project root (flake.nix not found)"
          exit 1
        fi
        cd "$project_root/crates/migrations"
        cargo run -- add $1
      '';
    };
  };
}
