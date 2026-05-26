#!/usr/bin/env sh

set -eu

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT_DIR/native/bin"
mkdir -p "$OUT_DIR"

cc "$ROOT_DIR/native/decrypter.c" -O2 -Wall -Wextra -o "$OUT_DIR/decrypter"
echo "Built $OUT_DIR/decrypter"
