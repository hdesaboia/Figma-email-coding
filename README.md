# Figma Email Converter

Convert Figma designs to HTML emails automatically.

## Setup

1. Clone this repository
2. Run `npm install`
3. Add your Figma API token to `.env`
4. Run `npm start`

## Usage

1. Update the Figma file ID in `src/index.js`
2. Run `npm start` to analyze and convert the design

## Project Structure

- `src/index.js` - Main application entry point
- `src/figma/api.js` - Figma API integration
- `.env` - Environment variables (API tokens) 