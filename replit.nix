{pkgs}: {
  deps = [
    pkgs.cargo
    pkgs.rustc
    pkgs.jq
    pkgs.postgresql
    pkgs.imagemagick
  ];
}
