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

    # Utilities
    just

    # Cargo dependencies
    openssl
    pkg-config

    # Depdencies for ledger interconnection
    node-gyp
    systemd
    udev
    libusb1
    pkgs.stdenv.cc.cc
  ];

  env.LD_LIBRARY_PATH = lib.makeLibraryPath config.packages;

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
