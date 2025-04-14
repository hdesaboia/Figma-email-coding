#!/bin/bash

echo "Setting up Figma Email Converter project..."

# Create project structure
mkdir -p src/figma src/config

# Create necessary files
touch .env
touch .gitignore

# Create .gitignore content
echo ".env" > .gitignore
echo "node_modules/" >> .gitignore

# Initialize npm project
npm init -y

# Install dependencies
npm install dotenv axios

echo "Setup complete! Now you need to:"
echo "1. Add your Figma API token to the .env file"
echo "2. Run 'npm start' to test the connection" 