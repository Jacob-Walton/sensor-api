#!/bin/bash
set -e

cd lambda

# Install cargo-lambda if not already installed
if ! command -v cargo-lambda &> /dev/null; then
    echo "Installing cargo-lambda..."
    cargo install cargo-lambda
fi

# Build each function
for function in submit_reading get_readings cleanup_old; do
    echo "Building $function..."
    cd $function
    cargo lambda build --release --arm64 --output-format zip
    cd ..
done

echo "Build complete!"