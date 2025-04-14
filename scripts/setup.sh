#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print status messages
print_status() {
    echo -e "${GREEN}[*]${NC} $1"
}

# Function to print warnings
print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# Function to print errors
print_error() {
    echo -e "${RED}[x]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
if [[ $(echo "$NODE_VERSION 14.0.0" | awk '{if ($1 < $2) print 1; else print 0}') -eq 1 ]]; then
    print_warning "Node.js version $NODE_VERSION is below the recommended version 14.0.0"
fi

# Create necessary directories
print_status "Creating project directories..."
mkdir -p data/training
mkdir -p models
mkdir -p reports

# Install npm dependencies
print_status "Installing npm dependencies..."
npm install axios openai jsdom dotenv

# Check if .env file exists
if [ ! -f .env ]; then
    print_warning ".env file not found. Creating template..."
    cat > .env << EOL
# Iterable API Configuration
ITERABLE_API_KEY=your_iterable_api_key_here

# OpenAI API Configuration (if using GPT-4)
OPENAI_API_KEY=your_openai_api_key_here

# Other Configuration
NODE_ENV=development
EOL
    print_status "Template .env file created. Please update it with your API keys."
fi

# Set up git hooks if .git exists
if [ -d .git ]; then
    print_status "Setting up git hooks..."
    mkdir -p .git/hooks
    cat > .git/hooks/pre-commit << EOL
#!/bin/sh
npm test
EOL
    chmod +x .git/hooks/pre-commit
fi

print_status "Setup complete!"
print_warning "Please update your .env file with the necessary API keys before running the training pipeline."
print_status "You can run the training pipeline with: node src/scripts/runPipeline.js" 