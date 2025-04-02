from flask import Flask, render_template, request, jsonify
import test_shopify_integration
import json
import traceback

app = Flask(__name__)

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

@app.route('/test', methods=['POST'])
def test_integration():
    try:
        data = request.get_json()
        shop_url = data.get('shop_url', '')
        access_token = data.get('access_token', '')
        api_version = data.get('api_version', '2023-10')
        diagnostic_mode = data.get('diagnostic_mode', False)
        
        if not shop_url or not access_token:
            return jsonify({
                'success': False,
                'message': 'Both shop URL and access token are required.'
            }), 400
        
        # Call the appropriate test function based on diagnostic mode
        if diagnostic_mode:
            results = test_shopify_integration.diagnose_shopify_api(shop_url, access_token, api_version)
            return jsonify({
                'success': True,
                'diagnostic_results': results,
                'mode': 'diagnostic'
            })
        else:
            # Call the regular test integration function
            results = test_shopify_integration.test_integration(shop_url, access_token, api_version)
            return jsonify({
                'success': True,
                'results': results,
                'mode': 'integration'
            })
    except Exception as e:
        # Log the full exception
        print(f"Error processing request: {str(e)}")
        print(traceback.format_exc())
        
        # Return a user-friendly error
        return jsonify({
            'success': False,
            'message': f"Error testing integration: {str(e)}",
            'error_details': traceback.format_exc() if app.debug else None
        }), 500

if __name__ == '__main__':
    app.run(debug=True) 