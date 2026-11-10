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
            packages = with pkgs; let
                findroot = /*sh*/ "source ${pkgs.writeShellScriptBin "findroot" /*sh*/ ''
                    while ! grep -q "/sportsmeet$" <(pwd); do
                        echo "not in sportsmeet repo root, searching up..."
                        echo
                        cd ..

                        if [ "$(pwd)" == "/" ]; then
                            echo "failed to find root of sportsmeet repo"
                            exit 1
                        fi
                    done
                ''}/bin/findroot || exit 1";
            in [
                nodejs_22
                postgresql

                google-chrome
                zsh

                (pkgs.writeShellScriptBin "db" /*sh*/ ''
                    ${findroot}
                    postgres -D ./.postgresql -k "$(pwd)/.postgresql"
                '')

                (pkgs.writeShellScriptBin "cl" /*sh*/ ''
                    ${findroot}
                    cd client
                    npm run dev
                '')

                (pkgs.writeShellScriptBin "srv" /*sh*/ ''
                    ${findroot}
                    cd server
                    npm run dev
                '')
            ];

            shellHook = "exec zsh";
        };
    };
}
