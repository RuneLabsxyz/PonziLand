{
  pkgs,
  lib,
  config,
  inputs,
  system,
  ...
}: let
  system = pkgs.stdenv.system;
  dojoVersion = "1.0.12";
  dojo-nix = inputs.cairo-nix.legacyPackages.${system};
  cairo-nix = inputs.cairo-nix.packages.${system};
in {
  packages = with pkgs; [
    git
    dojo-nix.dojo.${dojoVersion}.all
    cairo-nix.scarb
    cairo-nix.starkli
    cairo-nix.slot
    jq
    bc
    colorized-logs
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
