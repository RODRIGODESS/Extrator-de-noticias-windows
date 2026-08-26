#!/usr/bin/env bash
set -e
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
APP="$BASE_DIR/ExtratorMaterias-Ubuntu-Portable-V1.25.10.AppImage"

if [ ! -f "$APP" ]; then
  echo "Arquivo não encontrado: $APP"
  echo "Mantenha o AppImage e este iniciador na mesma pasta."
  read -r -p "Pressione Enter para sair..." _
  exit 1
fi

chmod +x "$APP" 2>/dev/null || true
exec "$APP" "$@"
