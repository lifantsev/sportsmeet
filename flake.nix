{
    description = "sportsmeet development shell";

    inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-26.05";

    outputs = { nixpkgs, ... }: let
        system = "aarch64-linux";
        pkgs = import nixpkgs {
            inherit system;
            config.allowUnfree = true;
        };
    in {
        devShells.${system}.default = pkgs.mkShell {
            packages = with pkgs; [
                google-chrome
                nodejs_22
                zsh
            ];

            shellHook = "exec zsh";
        };
    };
}
