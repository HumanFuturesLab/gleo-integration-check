from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

@app.route('/', methods=['GET'])
def index():
    return '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Shopify Integration Check</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; }
            input[type="text"] { width: 100%; padding: 8px; }
            button { background: #008060; color: white; padding: 10px 20px; border: none; cursor: pointer; }
            .result { margin-top: 20px; padding: 10px; border-radius: 4px; }
            .success { background: #e3f9e5; color: #008060; }
            .error { background: #ffe5e5; color: #d82c0d; }
        </style>
    </head>
    <body>
        <h1>Shopify Integration Check</h1>
        <div class="form-group">
            <label for="store_url">Store URL:</label>
            <input type="text" id="store_url" placeholder="mystore.myshopify.com">
        </div>
        <div class="form-group">
            <label for="access_token">Access Token:</label>
            <input type="text" id="access_token" placeholder="shpat_...">
        </div>
        <button onclick="checkIntegration()">Check Integration</button>
        <div id="result"></div>

        <script>
        function checkIntegration() {
            const store_url = document.getElementById('store_url').value;
            const access_token = document.getElementById('access_token').value;
            const resultDiv = document.getElementById('result');
            
            fetch('/check_integration', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    store_url: store_url,
                    access_token: access_token
                })
            })
            .then(response => response.json())
            .then(data => {
                resultDiv.className = `result ${data.status}`;
                resultDiv.textContent = data.message;
            })
            .catch(error => {
                resultDiv.className = 'result error';
                resultDiv.textContent = 'Error: ' + error.message;
            });
        }
        </script>
    </body>
    </html>
    '''

@app.route('/check_integration', methods=['POST'])
def check_integration():
    try:
        data = request.get_json()
        store_url = data.get('store_url')
        access_token = data.get('access_token')
        
        if not store_url or not access_token:
            return jsonify({'status': 'error', 'message': 'Missing required parameters'}), 400

        # Remove 'https://' if present
        store_url = store_url.replace('https://', '').replace('http://', '')
        
        # Remove trailing slash if present
        store_url = store_url.rstrip('/')
        
        # Construct the Shopify Admin API URL
        api_url = f"https://{store_url}/admin/api/2024-01/shop.json"
        
        headers = {
            'X-Shopify-Access-Token': access_token,
            'Content-Type': 'application/json'
        }
        
        response = requests.get(api_url, headers=headers)
        if response.status_code == 200:
            return jsonify({'status': 'success', 'message': 'Integration successful!'})
        else:
            return jsonify({
                'status': 'error', 
                'message': f'API request failed with status code: {response.status_code}'
            }), response.status_code
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

def handle_request(request):
    """Handle incoming requests and route them through Flask."""
    with app.request_context(request):
        try:
            response = app.full_dispatch_request()
            return response
        except Exception as e:
            return jsonify({'error': str(e)}), 500

def main(request, env, ctx):
    """Main entry point for the Cloudflare Worker."""
    return handle_request(request) 