{inputs, ...}: {
  perSystem = {
    pkgs,
    system,
    ...
  }: let
    cairo-nix = inputs.cairo-nix.packages.${system};
  in {
    packages = {
      # Cairo tools
      dojo = cairo-nix.dojo;
      scarb = cairo-nix.scarb;
      starkli = cairo-nix.starkli;
      slot = cairo-nix.slot;

      # Development packages for easy access
      default = pkgs.mkShell {
        name = "ponziland-dev";
        buildInputs = [cairo-nix.dojo cairo-nix.scarb];
      };
    };
  };
}
