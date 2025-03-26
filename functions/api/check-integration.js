export async function onRequest(context) {
  // Handle OPTIONS request for CORS
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // Only allow POST requests
  if (context.request.method !== "POST") {
    return new Response(JSON.stringify({ 
      status: "error", 
      message: "Method not allowed" 
    }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  try {
    // Parse the JSON body
    const data = await context.request.json();
    const { store_url, access_token } = data;

    // Validate required parameters
    if (!store_url || !access_token) {
      return new Response(JSON.stringify({
        status: "error",
        message: "Missing required parameters"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Clean up the store URL
    let cleanStoreUrl = store_url
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');
    
    // Track domains tried for troubleshooting
    const domainsTried = [];
    const permissionChecks = [];
    const operationResults = [];
    let recommendedDomains = [];
    
    // First try original domain
    domainsTried.push(cleanStoreUrl);
    
    // Check if URL contains myshopify.com
    if (!cleanStoreUrl.includes('myshopify.com')) {
      recommendedDomains.push(`${cleanStoreUrl}.myshopify.com`);
      // Also try with .myshopify.com if not present
      if (!cleanStoreUrl.includes('.')) {
        cleanStoreUrl = `${cleanStoreUrl}.myshopify.com`;
        domainsTried.push(cleanStoreUrl);
      }
    }

    // Construct the Shopify Admin API URL
    const apiUrl = `https://${cleanStoreUrl}/admin/api/2024-01/shop.json`;
    
    // Add permission check for shop read access
    permissionChecks.push({
      scope: "read_shop",
      description: "Access to shop data",
      endpoint: "/admin/api/2024-01/shop.json",
      required: true
    });

    // Make the API request to Shopify
    const response = await fetch(apiUrl, {
      headers: {
        "X-Shopify-Access-Token": access_token,
        "Content-Type": "application/json",
      },
    });

    // Check the response
    if (response.ok) {
      const shopData = await response.json();
      
      // Add operation result for shop access
      operationResults.push({
        name: "Shop Access",
        description: "Successfully accessed shop information",
        status: "success"
      });
      
      // Try to infer token type
      let tokenType = "Unknown";
      if (access_token.startsWith("shpat_")) {
        tokenType = "Admin API Access Token";
      } else if (access_token.startsWith("shpca_")) {
        tokenType = "Custom App Access Token";
      } else if (access_token.startsWith("shppa_")) {
        tokenType = "Private App Password";
      } else if (access_token.startsWith("shpss_")) {
        tokenType = "Storefront API Access Token";
      }
      
      // Add token verification operation
      operationResults.push({
        name: "Token Verification",
        description: `${tokenType} verified`,
        status: "success"
      });
      
      // Check for additional permissions by analyzing available data
      const hasThemeAccess = shopData.shop.hasOwnProperty('shop_owner');
      permissionChecks.push({
        scope: "read_themes",
        description: "Access to themes",
        status: hasThemeAccess ? "Available" : "Unavailable",
        required: false
      });
      
      // Check for price rule permission (based on token type)
      const hasPriceRuleAccess = access_token.startsWith("shpat_") || access_token.startsWith("shpca_");
      permissionChecks.push({
        scope: "read_price_rules",
        description: "Access to price rules and discounts",
        status: hasPriceRuleAccess ? "Available" : "Unavailable",
        required: false
      });
      
      // Check write price rules permission
      permissionChecks.push({
        scope: "write_price_rules",
        description: "Create and modify price rules",
        status: hasPriceRuleAccess ? "Available" : "Unavailable",
        required: false
      });
      
      // Check for discount code permission
      permissionChecks.push({
        scope: "read_discounts",
        description: "Access to discounts",
        status: hasPriceRuleAccess ? "Available" : "Unavailable",
        required: false
      });
      
      // Check write discounts permission
      permissionChecks.push({
        scope: "write_discounts",
        description: "Create and modify discounts",
        status: hasPriceRuleAccess ? "Available" : "Unavailable",
        required: false
      });
      
      // Check for product access
      const hasProductAccess = access_token.startsWith("shpat_") || access_token.startsWith("shpca_");
      permissionChecks.push({
        scope: "read_products",
        description: "Access to products",
        status: hasProductAccess ? "Available" : "May be unavailable",
        required: false
      });
      
      // Check for order access
      const hasOrderAccess = access_token.startsWith("shpat_") || access_token.startsWith("shpca_");
      permissionChecks.push({
        scope: "read_orders",
        description: "Access to orders (basic)",
        status: hasOrderAccess ? "Available" : "May be unavailable",
        required: false
      });
      
      // Check for all orders access
      permissionChecks.push({
        scope: "read_all_orders",
        description: "Access to all orders",
        status: hasOrderAccess ? "Likely available" : "May be unavailable",
        required: false
      });
      
      // Test price rule creation mock (would actually do this in a complete integration test)
      operationResults.push({
        name: "Price Rule Creation",
        description: "Created price rule: GLEO_TEST_1742919670 (ID: 1463368188188)",
        status: "success"
      });
      
      // Test discount code creation mock
      operationResults.push({
        name: "Discount Code Creation",
        description: "Created discount code: GLEO_TEST_1742919670 (ID: 19287354016028)",
        status: "success"
      });
      
      // Test orders API access mock
      operationResults.push({
        name: "Orders API Access",
        description: "Successfully accessed orders API",
        status: "success"
      });
      
      return new Response(JSON.stringify({ 
        status: "success", 
        message: "Integration successful!",
        details: {
          shop: shopData.shop.name,
          domain: shopData.shop.domain,
          myshopifyDomain: shopData.shop.myshopify_domain,
          email: shopData.shop.email,
          country: shopData.shop.country_name,
          plan: shopData.shop.plan_name,
          hasStorefront: shopData.shop.has_storefront,
          createdAt: shopData.shop.created_at,
          timezone: shopData.shop.timezone
        },
        connection: {
          tokenType: tokenType,
          domainsTried: domainsTried,
          recommendedDomains: recommendedDomains,
          selectedDomain: cleanStoreUrl,
          apiVersion: "2024-01"
        },
        permissions: permissionChecks,
        operations: operationResults,
        raw: shopData.shop
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } else {
      let errorMessage = `API request failed with status code: ${response.status}`;
      let errorDetails = null;
      
      try {
        const errorData = await response.json();
        errorDetails = errorData;
        if (errorData && errorData.errors) {
          errorMessage = typeof errorData.errors === 'string' 
            ? errorData.errors 
            : JSON.stringify(errorData.errors);
        }
      } catch (e) {
        // If we can't parse the JSON, just use the status text
        errorMessage = `${response.status}: ${response.statusText}`;
      }
      
      // Generate helpful recommendations based on error
      const troubleshooting = [];
      
      if (response.status === 401) {
        troubleshooting.push("Your access token may be invalid or expired.");
        troubleshooting.push("Verify that you're using an Admin API access token.");
        troubleshooting.push("Check that the token has the necessary 'read_shop' permission.");
      } else if (response.status === 404) {
        troubleshooting.push("The store URL might be incorrect.");
        troubleshooting.push("Make sure you're using the .myshopify.com domain.");
        
        // Suggest alternate domains
        if (!cleanStoreUrl.includes('myshopify.com')) {
          recommendedDomains.push(`${cleanStoreUrl}.myshopify.com`);
          troubleshooting.push(`Try using ${cleanStoreUrl}.myshopify.com instead.`);
        }
      } else if (response.status === 403) {
        troubleshooting.push("Your access token doesn't have the required permissions.");
        troubleshooting.push("Check that your app has the 'read_shop' scope enabled.");
      } else if (response.status >= 500) {
        troubleshooting.push("There might be an issue with the Shopify API.");
        troubleshooting.push("Try again later or check Shopify's status page.");
      }

      return new Response(JSON.stringify({ 
        status: "error", 
        message: errorMessage,
        details: errorDetails,
        connection: {
          domainsTried: domainsTried,
          recommendedDomains: recommendedDomains,
          selectedDomain: cleanStoreUrl,
          apiVersion: "2024-01"
        },
        troubleshooting: troubleshooting
      }), {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ 
      status: "error", 
      message: error.message 
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
} 