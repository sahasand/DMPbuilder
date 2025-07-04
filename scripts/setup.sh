#!/bin/bash

# Clinical DMP Generator Setup Script

echo "🏥 Clinical DMP Generator - Setup Script"
echo "========================================"
echo ""

# Check Node.js version
echo "Checking Node.js version..."
node_version=$(node -v 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Node.js is not installed. Please install Node.js 18.0.0 or higher."
    exit 1
fi

major_version=$(echo $node_version | cut -d'.' -f1 | sed 's/v//')
if [ $major_version -lt 18 ]; then
    echo "❌ Node.js version $node_version is too old. Please upgrade to 18.0.0 or higher."
    exit 1
fi
echo "✅ Node.js $node_version detected"

# Check npm version
echo "Checking npm version..."
npm_version=$(npm -v 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ npm is not installed."
    exit 1
fi
echo "✅ npm $npm_version detected"

# Install dependencies
echo ""
echo "Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo "✅ Dependencies installed"

# Check for .env file
echo ""
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and add your ANTHROPIC_API_KEY"
else
    echo "✅ .env file already exists"
fi

# Build the project
echo ""
echo "Building the project..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi
echo "✅ Project built successfully"

# Create output directory
echo ""
echo "Creating output directory..."
mkdir -p output
echo "✅ Output directory created"

# Final instructions
echo ""
echo "========================================="
echo "✅ Setup completed successfully!"
echo ""
echo "Next steps:"
echo "1. Edit .env file and add your ANTHROPIC_API_KEY"
echo "2. Run the CLI: npm run generate-dmp -- -p protocol.pdf -c crf.pdf"
echo "3. Or start the API server: npm start"
echo ""
echo "For more information, see README.md"
echo "========================================="