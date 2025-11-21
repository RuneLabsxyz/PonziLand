{inputs, ...}: {
  perSystem = {
    pkgs,
    system,
    ...
  }: let
    cairo-nix = inputs.cairo-nix.packages.${system};
  in {
    packages = {
      # Development packages for easy access
      default = pkgs.mkShell {
        name = "ponziland-dev";
        buildInputs = [cairo-nix.dojo cairo-nix.scarb-nightly];
      };
    };
  };
}
