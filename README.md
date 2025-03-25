# Shopify Integration Tester

A minimalistic web application for testing Shopify store integration with the GLEO platform. This tool helps verify that your Shopify store has the correct permissions and API access for seamless integration.

## Features

- Test connection to your Shopify store
- Verify required API permissions
- Test price rule and discount code creation
- Check for basic tier permissions
- Generate recommended domain format for database storage
- Detailed, user-friendly results dashboard

## Requirements

- Python 3.7+
- Flask
- Requests

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd shopify-integration-tester
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

1. Start the application:
```bash
python app.py
```

2. Open your browser and navigate to `http://localhost:5000`

3. Enter your Shopify store URL and API access token

4. Click "Test Integration" to run the tests

## Input Details

- **Shop URL**: Your Shopify store domain (e.g., `mystore.com` or `mystore.myshopify.com`)
- **Access Token**: Your Shopify Admin API access token (starts with `shpat_`)

## Security Note

This application is designed for local use or within a secure internal network. It handles sensitive API keys, so be cautious when deploying to public environments.

## License

MIT 