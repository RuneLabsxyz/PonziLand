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
    wrangler
    graphite-cli

    # Cargo dependencies
    pkgs.openssl
    pkgs.pkg-config
  ];

  languages.javascript = {
    enable = true;
    bun.enable = true;
  };

  languages.rust = {
    enable = true;
    mold.enable = true;
  };

  cachix = {
    enable = true;
    pull = ["dojo-nix"];
  };
}
