{
  pkgs,
  lib,
  config,
  inputs,
  system,
  ...
}: let
  system = pkgs.stdenv.system;
  dojo-nix = inputs.cairo-nix.legacyPackages.${system};
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
  ];

  languages.javascript = {
    enable = true;
    bun.enable = true;
  };

  cachix = {
    enable = true;
    pull = ["dojo-nix"];
  };
}
