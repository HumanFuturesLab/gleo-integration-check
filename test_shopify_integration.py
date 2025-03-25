#!/usr/bin/env python
import requests
import json
import sys
import datetime
import time
from urllib.parse import urlparse

def get_myshopify_domain(shop_url):
    """Convert any shop URL format to the myshopify domain format"""
    # Remove protocol if present
    if '://' in shop_url:
        shop_url = urlparse(shop_url).netloc
    
    # If already in myshopify format, return as is
    if '.myshopify.com' in shop_url:
        return shop_url
    
    # If it already has .myshopify (without .com), add .com
    if '.myshopify' in shop_url and not '.myshopify.com' in shop_url:
        return shop_url.replace('.myshopify', '.myshopify.com')
    
    # Try to get the store name from the domain
    try:
        # First, split by dots and get the main domain name
        parts = shop_url.split('.')
        store_name = parts[0]
        
        # Some stores might have domains like 'www.storename.com'
        if store_name == 'www' and len(parts) > 1:
            store_name = parts[1]
        
        # Don't add underscores, try the name directly
        return f"{store_name}.myshopify.com"
    except Exception as e:
        print(f"Error parsing domain: {e}")
        return shop_url

def test_integration(shop_url, access_token):
    """Test the full integration flow with a shop"""
    results = {
        "connection": False,
        "permissions": {
            "read_price_rules": False,
            "write_price_rules": False,
            "read_discounts": False,
            "write_discounts": False,
            "read_orders": False,
            "read_all_orders": False
        },
        "price_rule_creation": False,
        "discount_code_creation": False,
        "original_domain": shop_url,
        "errors": []
    }
    
    # Get possible myshopify domain
    myshopify_domain = get_myshopify_domain(shop_url)
    
    # Extract base store name (without any domain)
    base_name = shop_url
    if '.myshopify.com' in base_name:
        base_name = base_name.replace('.myshopify.com', '')
    elif '.myshopify' in base_name:
        base_name = base_name.replace('.myshopify', '')
    elif '.com' in base_name:
        base_name = base_name.replace('.com', '')
    elif '.' in base_name:
        base_name = base_name.split('.')[0]
    
    # Ensure base_name doesn't contain domain suffixes
    base_name = base_name.replace('.myshopify', '').replace('.com', '')
    
    # List of domains to try - add more variations to increase chance of success
    domains_to_try = [
        shop_url,
        myshopify_domain,
        f"{base_name}.myshopify.com",
        # Try with hyphens instead of underscores
        base_name.replace('_', '-') + '.myshopify.com',
        # Try with underscores instead of hyphens
        base_name.replace('-', '_') + '.myshopify.com',
        # Try removing 'get' prefix if present
        base_name.replace('get', '', 1) + '.myshopify.com' if base_name.startswith('get') else base_name + '.myshopify.com',
        # Try with "my" prefix
        'my' + base_name + '.myshopify.com' if not base_name.startswith('my') else base_name + '.myshopify.com'
    ]
    
    # Remove duplicates and empty strings
    domains_to_try = list(set(domain for domain in domains_to_try if domain.strip()))
    results["domains_tried"] = domains_to_try
    
    working_domain = None
    
    # Try each domain format until we find one that works
    for domain in domains_to_try:
        print(f"\nTesting domain: {domain}")
        headers = {
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": access_token
        }
        
        # 1. Test basic connection
        try:
            response = requests.get(f"https://{domain}/admin/api/2023-10/shop.json", headers=headers, timeout=10)
            if response.status_code == 200:
                print(f"✅ Connection successful with domain: {domain}")
                results["connection"] = True
                results["connected_domain"] = domain
                working_domain = domain
                
                # Save shop details
                shop_data = response.json().get('shop', {})
                results["shop_name"] = shop_data.get('name')
                results["myshopify_domain"] = shop_data.get('myshopify_domain')
                results["plan_name"] = shop_data.get('plan_name')
                
                # If we found the actual myshopify domain in the response, use that
                if shop_data.get('myshopify_domain'):
                    working_domain = shop_data.get('myshopify_domain')
                    print(f"📌 Found official myshopify domain: {working_domain}")
                    results["official_myshopify_domain"] = working_domain
                
                break
            else:
                print(f"❌ Connection failed with domain: {domain} (Status code: {response.status_code})")
        except requests.exceptions.ConnectionError as e:
            print(f"❌ Connection failed with domain: {domain} (Domain resolution error)")
            continue
        except requests.exceptions.RequestException as e:
            print(f"❌ Connection failed with domain: {domain} (Request error: {str(e)})")
            continue
    
    if not working_domain:
        results["errors"].append("Could not establish connection with any domain format")
        return results
    
    # 2. Check permissions
    try:
        response = requests.get(f"https://{working_domain}/admin/oauth/access_scopes.json", headers=headers)
        if response.status_code == 200:
            scopes = [scope.get('handle') for scope in response.json().get('access_scopes', [])]
            results["all_permissions"] = scopes
            
            # Check required permissions
            permission_map = {
                "read_price_rules": "read_price_rules",
                "write_price_rules": "write_price_rules",
                "read_discounts": "read_discounts",
                "write_discounts": "write_discounts",
                "read_orders": "read_orders",
                "read_all_orders": "read_all_orders"
            }
            
            for perm_key, perm_value in permission_map.items():
                if perm_value in scopes:
                    results["permissions"][perm_key] = True
                    print(f"✅ Permission granted: {perm_value}")
                else:
                    print(f"❌ Permission missing: {perm_value}")
    except Exception as e:
        results["errors"].append(f"Error checking permissions: {str(e)}")
    
    # 3. Test creating a price rule
    if results["permissions"]["write_price_rules"]:
        try:
            timestamp = int(time.time())
            price_rule_data = {
                "price_rule": {
                    "title": f"GLEO_TEST_{timestamp}",
                    "target_type": "line_item",
                    "target_selection": "all",
                    "allocation_method": "across",
                    "value_type": "percentage",
                    "value": "-10.0",
                    "customer_selection": "all",
                    "starts_at": datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S+05:30"),
                    "usage_limit": 1,
                    "once_per_customer": True
                }
            }
            
            response = requests.post(
                f"https://{working_domain}/admin/api/2023-10/price_rules.json",
                headers=headers,
                data=json.dumps(price_rule_data)
            )
            
            if response.status_code in [200, 201]:
                price_rule = response.json().get("price_rule", {})
                price_rule_id = price_rule.get("id")
                results["price_rule_creation"] = True
                results["price_rule_id"] = price_rule_id
                results["price_rule_title"] = price_rule.get("title")
                print(f"✅ Price rule created: {price_rule.get('title')} (ID: {price_rule_id})")
                
                # 4. Test creating a discount code for this price rule
                if results["permissions"]["write_discounts"] and price_rule_id:
                    try:
                        discount_code_data = {
                            "discount_code": {
                                "code": f"GLEO_TEST_{timestamp}"
                            }
                        }
                        
                        response = requests.post(
                            f"https://{working_domain}/admin/api/2023-10/price_rules/{price_rule_id}/discount_codes.json",
                            headers=headers,
                            data=json.dumps(discount_code_data)
                        )
                        
                        if response.status_code in [200, 201]:
                            discount_code = response.json().get("discount_code", {})
                            results["discount_code_creation"] = True
                            results["discount_code"] = discount_code.get("code")
                            results["discount_code_id"] = discount_code.get("id")
                            print(f"✅ Discount code created: {discount_code.get('code')}")
                        else:
                            print(f"❌ Failed to create discount code: {response.status_code}")
                            print(f"Response: {response.text}")
                            results["errors"].append(f"Discount code creation failed: {response.text}")
                    except Exception as e:
                        results["errors"].append(f"Error creating discount code: {str(e)}")
            else:
                print(f"❌ Failed to create price rule: {response.status_code}")
                print(f"Response: {response.text}")
                results["errors"].append(f"Price rule creation failed: {response.text}")
        except Exception as e:
            results["errors"].append(f"Error creating price rule: {str(e)}")
    
    # 5. Test reading orders API (if permissions exist)
    if results["permissions"]["read_orders"] or results["permissions"]["read_all_orders"]:
        try:
            response = requests.get(
                f"https://{working_domain}/admin/api/2023-10/orders.json?limit=1",
                headers=headers
            )
            if response.status_code == 200:
                results["orders_api_access"] = True
                print(f"✅ Successfully accessed orders API")
            else:
                results["orders_api_access"] = False
                print(f"❌ Failed to access orders API: {response.status_code}")
                results["errors"].append(f"Orders API access failed: {response.text}")
        except Exception as e:
            results["errors"].append(f"Error accessing orders API: {str(e)}")
    
    return results

def print_summary(results):
    """Print a clear summary of the test results"""
    print("\n" + "="*50)
    print("SHOPIFY INTEGRATION TEST SUMMARY")
    print("="*50)
    
    # Connection
    if results["connection"]:
        print("\n✅ CONNECTION: Successful")
        print(f"  Store name: {results.get('shop_name')}")
        print(f"  Plan: {results.get('plan_name')}")
        print(f"  Connected domain: {results.get('connected_domain')}")
        if results.get('official_myshopify_domain'):
            print(f"  Official myshopify domain: {results.get('official_myshopify_domain')}")
    else:
        print("\n❌ CONNECTION: Failed")
        print(f"  Domains tried: {', '.join(results.get('domains_tried', []))}")
    
    # Permissions
    print("\nPERMISSIONS:")
    required_permissions = ["read_price_rules", "write_price_rules", "read_discounts", "write_discounts"]
    basic_tier_permissions = ["read_orders", "read_all_orders"]
    
    for perm in required_permissions:
        status = "✅" if results["permissions"][perm] else "❌"
        print(f"  {status} {perm}")
    
    print("\nBASIC TIER PERMISSIONS:")
    for perm in basic_tier_permissions:
        status = "✅" if results["permissions"][perm] else "❌"
        print(f"  {status} {perm}")
    
    # Operations
    print("\nOPERATIONS:")
    if results.get("price_rule_creation"):
        print(f"  ✅ Price rule creation: {results.get('price_rule_title')} (ID: {results.get('price_rule_id')})")
    else:
        print("  ❌ Price rule creation failed")
    
    if results.get("discount_code_creation"):
        print(f"  ✅ Discount code creation: {results.get('discount_code')}")
    else:
        print("  ❌ Discount code creation failed")
    
    if results.get("orders_api_access") is not None:
        status = "✅" if results.get("orders_api_access") else "❌"
        print(f"  {status} Orders API access")
    
    # Errors
    if results.get("errors"):
        print("\nERRORS:")
        for i, error in enumerate(results.get("errors"), 1):
            print(f"  {i}. {error}")
    
    # Final result and recommendations
    print("\nFINAL RESULT:")
    if (results["connection"] and 
        all(results["permissions"][p] for p in required_permissions) and
        results.get("price_rule_creation") and 
        results.get("discount_code_creation")):
        print("✅ PASS: All core functionality is working correctly")
        
        # Check if it's Basic tier
        if results.get("plan_name", "").lower() == "basic":
            if all(results["permissions"][p] for p in basic_tier_permissions):
                print("✅ Basic tier permissions are correctly configured")
            else:
                print("⚠️ WARNING: This is a Basic tier shop but some required Basic tier permissions are missing")
    else:
        print("❌ FAIL: Integration is not fully functional")
    
    print("\nRECOMMENDED DOMAIN FOR DATABASE:")
    if results.get("official_myshopify_domain"):
        print(f"  👉 {results.get('official_myshopify_domain')}")
    elif results.get("connected_domain"):
        print(f"  👉 {results.get('connected_domain')}")
    else:
        print("  ❓ Could not determine the correct domain")
    
    print("="*50)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python test_shopify_integration.py <shop_url> <access_token>")
        print("Example: python test_shopify_integration.py mystore.com shpat_1234567890abcdef")
        sys.exit(1)
    
    shop_url = sys.argv[1]
    access_token = sys.argv[2]
    
    print(f"Testing Shopify integration for: {shop_url}")
    results = test_integration(shop_url, access_token)
    print_summary(results) 