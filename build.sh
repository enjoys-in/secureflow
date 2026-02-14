#!/usr/bin/env bash
set -euo pipefail

APP_NAME="secureflow"
BUILD_DIR="./build"
WEB_DIR="./web"
GO_ENTRY="./cmd/server"

# ---- Parse CLI flags ----
for arg in "$@"; do
  case "$arg" in
    --target=*)
      BUILD_OS="${arg#*=}"
      ;;
    --arch=*)
      BUILD_ARCH="${arg#*=}"
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Usage: bash build.sh [--target=linux|windows|darwin] [--arch=amd64|arm64]"
      exit 1
      ;;
  esac
done

echo "========================================"
echo "  Building $APP_NAME"
echo "========================================"

# ---- 1. Build frontend ----
echo ""
echo "[1/4] Installing frontend dependencies..."
(
  cd "$WEB_DIR"
  bun install --frozen-lockfile
  echo "[2/4] Building frontend (Vite)..."
  bun run build
)

# ---- 2. Prepare build directory ----
echo "[3/4] Preparing build directory..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy frontend dist into build/web/dist (Go serves from ./web/dist)
cp -r "$WEB_DIR/dist" "$BUILD_DIR/"

# Copy migrations
cp -r ./migrations "$BUILD_DIR/migrations"

cp -r ./.env "$BUILD_DIR/.env"
# Copy OpenFGA model
mkdir -p "$BUILD_DIR/openfga"
cp ./openfga/model.dsl "$BUILD_DIR/openfga/model.dsl"

# ---- 3. Build Go binary ----
echo "[4/4] Compiling Go binary..."

# Default to current OS/arch; override with BUILD_OS / BUILD_ARCH
TARGET_OS="${BUILD_OS:-$(go env GOOS)}"
TARGET_ARCH="${BUILD_ARCH:-$(go env GOARCH)}"

SUFFIX=""
if [ "$TARGET_OS" = "windows" ]; then
  SUFFIX=".exe"
fi

CGO_ENABLED=0 GOOS="$TARGET_OS" GOARCH="$TARGET_ARCH" \
  go build -ldflags="-s -w" -o "$BUILD_DIR/${APP_NAME}${SUFFIX}" "$GO_ENTRY"

echo ""
echo "========================================"
echo "  Build complete!"
echo "  Binary:   $BUILD_DIR/${APP_NAME}${SUFFIX}"
echo "  Frontend: $BUILD_DIR/web/dist/"
echo "  Target:   ${TARGET_OS}/${TARGET_ARCH}"
echo "========================================"
echo ""
echo "To run:"
echo "  cd $BUILD_DIR && ./${APP_NAME}${SUFFIX}"
