document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('integration-form');
    const shopUrlInput = document.getElementById('shop-url');
    const accessTokenInput = document.getElementById('access-token');
    const toggleTokenBtn = document.getElementById('toggle-token');
    const testButton = document.getElementById('test-button');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const resultsCard = document.getElementById('results-card');
    const resultsLoading = document.getElementById('results-loading');
    const resultsContent = document.getElementById('results-content');
    const backButton = document.getElementById('back-button');
    const overallStatus = document.getElementById('overall-status');
    
    // Input enhancements
    function setupInputHighlighting() {
        const inputs = [shopUrlInput, accessTokenInput];
        inputs.forEach(input => {
            // Add visual feedback when input is valid or has content
            input.addEventListener('input', function() {
                if (this.value.trim() !== '') {
                    this.classList.add('is-valid');
                } else {
                    this.classList.remove('is-valid');
                }
            });
            
            // Remove validation styling on focus
            input.addEventListener('focus', function() {
                this.classList.remove('is-invalid');
            });
        });
    }
    
    // Toggle password visibility with animation
    toggleTokenBtn.addEventListener('click', function() {
        const type = accessTokenInput.getAttribute('type') === 'password' ? 'text' : 'password';
        accessTokenInput.setAttribute('type', type);
        toggleTokenBtn.innerHTML = type === 'password' ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
        
        // Add highlight effect when toggled
        toggleTokenBtn.classList.add('active');
        setTimeout(() => toggleTokenBtn.classList.remove('active'), 300);
    });
    
    // Back button functionality
    backButton.addEventListener('click', function() {
        resultsCard.classList.add('d-none');
        backButton.style.display = 'none';
        // Reset form state
        resetFormState();
        // Focus on shop URL input
        shopUrlInput.focus();
    });
    
    // Form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const shopUrl = shopUrlInput.value.trim();
        const accessToken = accessTokenInput.value.trim();
        
        // Validate inputs with visual feedback
        let isValid = true;
        
        if (!shopUrl) {
            shopUrlInput.classList.add('is-invalid');
            isValid = false;
        }
        
        if (!accessToken) {
            accessTokenInput.classList.add('is-invalid');
            isValid = false;
        }
        
        if (!isValid) {
            // Subtle shake animation for invalid form
            form.classList.add('shake');
            setTimeout(() => form.classList.remove('shake'), 600);
            return;
        }
        
        // Show loading state
        btnText.textContent = 'Testing...';
        btnSpinner.classList.remove('d-none');
        testButton.disabled = true;
        
        // Reset result sections to show loading states
        resetResultSections();
        
        // Show results card with loading state
        resultsCard.classList.remove('d-none');
        backButton.style.display = 'block';
        resultsLoading.classList.remove('d-none');
        resultsContent.classList.add('d-none');
        
        // On mobile devices, scroll to results
        if (window.innerWidth < 768) {
            resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        
        // Send API request
        fetch('/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                shop_url: shopUrl,
                access_token: accessToken
            }),
        })
        .then(response => {
            // First, check if the response is ok
            if (!response.ok) {
                return response.json().then(errorData => {
                    throw new Error(errorData.message || 'Server error');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                displayResults(data.results);
            } else {
                // Show error alert with message
                const errorMessage = data.message || 'Unknown error occurred';
                showErrorMessage(errorMessage);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showErrorMessage(error.message || 'An error occurred while testing the integration. Please try again.');
        })
        .finally(() => {
            // Reset button state
            btnText.textContent = 'Test Integration';
            btnSpinner.classList.add('d-none');
            testButton.disabled = false;
            
            // Hide loading
            resultsLoading.classList.add('d-none');
        });
    });
    
    // Reset all result sections to empty states
    function resetResultSections() {
        const sections = [
            'connection-status',
            'permissions-status',
            'operations-status',
            'final-result',
            'recommended-domain'
        ];
        
        sections.forEach(id => {
            const section = document.getElementById(id);
            if (section) {
                section.innerHTML = `
                    <div class="results-empty-state">
                        <i class="bi bi-arrow-repeat"></i>
                        <p>Loading ${id.replace('-', ' ')}...</p>
                    </div>
                `;
            }
        });
        
        document.getElementById('errors-list').innerHTML = '';
        document.getElementById('errors-section').classList.add('d-none');
        overallStatus.innerHTML = '';
    }
    
    function displayResults(results) {
        // Clear previous results
        document.getElementById('connection-status').innerHTML = '';
        document.getElementById('permissions-status').innerHTML = '';
        document.getElementById('operations-status').innerHTML = '';
        document.getElementById('errors-list').innerHTML = '';
        document.getElementById('errors-section').classList.add('d-none');
        document.getElementById('final-result').innerHTML = '';
        document.getElementById('recommended-domain').innerHTML = '';
        overallStatus.innerHTML = '';
        
        console.log("Results received:", results); // For debugging
        
        // Transform backend data format to UI format if needed
        const transformedResults = transformResultsIfNeeded(results);
        
        // Add overall status at the top
        let overallResult = transformedResults.overall_result || '';
        let statusClass = 'success';
        let statusIcon = 'check-circle-fill';
        
        if (overallResult === 'FAILED') {
            statusClass = 'danger';
            statusIcon = 'x-circle-fill';
        } else if (overallResult === 'PARTIAL') {
            statusClass = 'warning'; 
            statusIcon = 'exclamation-triangle-fill';
        }
        
        if (overallResult) {
            const resultText = overallResult === 'SUCCESS' ? 'All tests passed successfully!' :
                               overallResult === 'PARTIAL' ? 'Some tests passed with warnings' :
                               'Integration tests failed';
                               
            overallStatus.innerHTML = `
                <div class="status-item status-${statusClass} mb-4">
                    <div class="status-icon">
                        <i class="bi bi-${statusIcon} text-${statusClass}"></i>
                    </div>
                    <div>
                        <h6>${resultText}</h6>
                        <p>${overallResult === 'SUCCESS' ? 'Your Shopify integration is configured correctly and ready to use.' : 
                             overallResult === 'PARTIAL' ? 'Your integration works but there are some issues to address.' :
                             'There are critical issues that need to be fixed before the integration can work.'}</p>
                    </div>
                </div>
            `;
        }
        
        // Process connection results with delay for animation effect
        setTimeout(() => {
            if (transformedResults.connection_results && transformedResults.connection_results.length > 0) {
                const connectionStatusEl = document.getElementById('connection-status');
                connectionStatusEl.innerHTML = ''; // Clear loading state
                transformedResults.connection_results.forEach((result, index) => {
                    setTimeout(() => {
                        const statusItem = createStatusItem(result);
                        connectionStatusEl.appendChild(statusItem);
                        statusItem.classList.add('fade-in');
                    }, index * 100);
                });
            }
        }, 100);
        
        // Process permissions results with delay
        setTimeout(() => {
            if (transformedResults.permissions_results && transformedResults.permissions_results.length > 0) {
                const permissionsStatusEl = document.getElementById('permissions-status');
                permissionsStatusEl.innerHTML = ''; // Clear loading state
                transformedResults.permissions_results.forEach((result, index) => {
                    setTimeout(() => {
                        const statusItem = createStatusItem(result);
                        permissionsStatusEl.appendChild(statusItem);
                        statusItem.classList.add('fade-in');
                    }, index * 100);
                });
            }
        }, 300);
        
        // Process operations results with delay
        setTimeout(() => {
            if (transformedResults.operations_results && transformedResults.operations_results.length > 0) {
                const operationsStatusEl = document.getElementById('operations-status');
                operationsStatusEl.innerHTML = ''; // Clear loading state
                transformedResults.operations_results.forEach((result, index) => {
                    setTimeout(() => {
                        const statusItem = createStatusItem(result);
                        operationsStatusEl.appendChild(statusItem);
                        statusItem.classList.add('fade-in');
                    }, index * 100);
                });
            }
        }, 500);
        
        // Process errors if any
        setTimeout(() => {
            if (transformedResults.errors && transformedResults.errors.length > 0) {
                const errorsListEl = document.getElementById('errors-list');
                document.getElementById('errors-section').classList.remove('d-none');
                
                transformedResults.errors.forEach((error) => {
                    const li = document.createElement('li');
                    li.textContent = error;
                    errorsListEl.appendChild(li);
                });
            }
        }, 700);
        
        // Set final result
        setTimeout(() => {
            if (transformedResults.result_message) {
                const finalResultEl = document.getElementById('final-result');
                finalResultEl.innerHTML = ''; // Clear loading state
                const statusClass = transformedResults.overall_result === 'SUCCESS' ? 'success' :
                                   transformedResults.overall_result === 'PARTIAL' ? 'warning' : 'danger';
                                   
                finalResultEl.innerHTML = `
                    <div class="alert alert-${statusClass} fade-in">
                        ${transformedResults.result_message}
                    </div>
                `;
            }
        }, 800);
        
        // Set recommended domain
        setTimeout(() => {
            if (transformedResults.recommended_domain) {
                const recommendedDomainEl = document.getElementById('recommended-domain');
                recommendedDomainEl.innerHTML = ''; // Clear loading state
                recommendedDomainEl.innerHTML = `
                    <div class="fade-in">
                        <strong>Recommended Domain:</strong> ${transformedResults.recommended_domain}
                        <div class="mt-2">
                            <small>This is the recommended domain format to use when configuring your integration in GLEO.</small>
                        </div>
                    </div>
                `;
            }
        }, 900);
        
        // Show results content, hide loading
        resultsLoading.classList.add('d-none');
        resultsContent.classList.remove('d-none');
        backButton.style.display = 'block';
        
        // Reset button state
        resetFormState();
        
        // On mobile devices, scroll to top of results
        if (window.innerWidth < 768) {
            resultsCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    // Helper function to transform backend results to UI-expected format if needed
    function transformResultsIfNeeded(results) {
        // Check if we have the expected format already
        if (results.connection_results && 
            results.permissions_results && 
            results.operations_results) {
            return results;
        }
        
        // Initialize transformed structure
        const transformed = {
            connection_results: [],
            permissions_results: [],
            operations_results: [],
            errors: results.errors || [],
            overall_result: '',
            result_message: '',
            recommended_domain: ''
        };

        // Determine overall result based on backend data
        let hasErrors = false;
        let hasWarnings = false;
        
        // Connection results
        if (results.connection) {
            transformed.connection_results.push({
                status: 'SUCCESS',
                name: 'Connection',
                message: `Connected to ${results.connected_domain || results.shop_name || 'Shopify store'}`
            });
            
            if (results.shop_name) {
                transformed.connection_results.push({
                    status: 'SUCCESS',
                    name: 'Store Information',
                    message: `Store Name: ${results.shop_name}, Plan: ${results.plan_name || 'Unknown'}`
                });
            }
            
            if (results.official_myshopify_domain) {
                transformed.recommended_domain = results.official_myshopify_domain;
            } else if (results.connected_domain) {
                transformed.recommended_domain = results.connected_domain;
            }
        } else {
            hasErrors = true;
            transformed.connection_results.push({
                status: 'ERROR',
                name: 'Connection',
                message: 'Failed to connect to Shopify store'
            });
            
            if (results.domains_tried && results.domains_tried.length > 0) {
                transformed.connection_results.push({
                    status: 'ERROR',
                    name: 'Domains Tried',
                    message: results.domains_tried.join(', ')
                });
            }
        }
        
        // Permissions results
        const requiredPermissions = [
            { key: 'read_price_rules', label: 'Read Price Rules' },
            { key: 'write_price_rules', label: 'Write Price Rules' },
            { key: 'read_discounts', label: 'Read Discounts' },
            { key: 'write_discounts', label: 'Write Discounts' }
        ];
        
        const basicPermissions = [
            { key: 'read_orders', label: 'Read Orders' },
            { key: 'read_all_orders', label: 'Read All Orders' }
        ];
        
        if (results.permissions) {
            requiredPermissions.forEach(perm => {
                const isGranted = results.permissions[perm.key];
                transformed.permissions_results.push({
                    status: isGranted ? 'SUCCESS' : 'ERROR',
                    name: perm.label,
                    message: isGranted ? 'Permission granted' : 'Permission not granted'
                });
                
                if (!isGranted) {
                    hasErrors = true;
                }
            });
            
            basicPermissions.forEach(perm => {
                const isGranted = results.permissions[perm.key];
                transformed.permissions_results.push({
                    status: isGranted ? 'SUCCESS' : 'WARNING',
                    name: perm.label + ' (Basic)',
                    message: isGranted ? 'Permission granted' : 'Basic permission not granted'
                });
                
                if (!isGranted) {
                    hasWarnings = true;
                }
            });
        }
        
        // Operations results
        if (results.price_rule_creation !== undefined) {
            transformed.operations_results.push({
                status: results.price_rule_creation ? 'SUCCESS' : 'ERROR',
                name: 'Price Rule Creation',
                message: results.price_rule_creation ? 
                    `Created price rule: ${results.price_rule_title || ''} (ID: ${results.price_rule_id || ''})` : 
                    'Failed to create price rule'
            });
            
            if (!results.price_rule_creation) {
                hasErrors = true;
            }
        }
        
        if (results.discount_code_creation !== undefined) {
            transformed.operations_results.push({
                status: results.discount_code_creation ? 'SUCCESS' : 'ERROR',
                name: 'Discount Code Creation',
                message: results.discount_code_creation ? 
                    `Created discount code: ${results.discount_code || ''} (ID: ${results.discount_code_id || ''})` : 
                    'Failed to create discount code'
            });
            
            if (!results.discount_code_creation) {
                hasErrors = true;
            }
        }
        
        if (results.orders_api_access !== undefined) {
            transformed.operations_results.push({
                status: results.orders_api_access ? 'SUCCESS' : 'WARNING',
                name: 'Orders API Access',
                message: results.orders_api_access ? 
                    'Successfully accessed orders API' : 
                    'Could not access orders API'
            });
            
            if (!results.orders_api_access) {
                hasWarnings = true;
            }
        }
        
        // Set overall result
        if (hasErrors) {
            transformed.overall_result = 'FAILED';
            transformed.result_message = 'The integration test failed. Please review the issues above before continuing.';
        } else if (hasWarnings) {
            transformed.overall_result = 'PARTIAL';
            transformed.result_message = 'The integration test passed with some warnings. You may proceed, but consider addressing the warnings.';
        } else {
            transformed.overall_result = 'SUCCESS';
            transformed.result_message = 'All tests passed successfully! Your Shopify integration is ready to use.';
        }
        
        return transformed;
    }
    
    // Helper function to create status items with improved design
    function createStatusItem(result) {
        const div = document.createElement('div');
        div.className = `status-item status-${result.status.toLowerCase()}`;
        
        const iconMapping = {
            'SUCCESS': 'check-circle-fill',
            'WARNING': 'exclamation-triangle-fill',
            'ERROR': 'x-circle-fill'
        };
        
        div.innerHTML = `
            <div class="status-icon">
                <i class="bi bi-${iconMapping[result.status]} text-${result.status.toLowerCase()}"></i>
            </div>
            <div>
                <h6>${result.name}</h6>
                <p>${result.message}</p>
            </div>
        `;
        
        return div;
    }
    
    // Function to reset form state
    function resetFormState() {
        btnText.textContent = 'Test Integration';
        btnSpinner.classList.add('d-none');
        testButton.disabled = false;
    }
    
    // Show user-friendly error message
    function showErrorMessage(message) {
        resultsLoading.classList.add('d-none');
        backButton.style.display = 'block';
        
        // Create an error display in the results content
        resultsContent.innerHTML = `
            <div class="p-3">
                <div class="alert alert-danger fade-in mb-3">
                    <h5 class="alert-heading">
                        <i class="bi bi-exclamation-triangle-fill me-2"></i>
                        Error Testing Integration
                    </h5>
                    <p class="mb-0">${message}</p>
                </div>
                <div class="text-center">
                    <button id="error-back-button" class="btn btn-sm btn-outline-secondary">
                        <i class="bi bi-arrow-left me-1"></i>Try Again
                    </button>
                </div>
            </div>
        `;
        
        resultsContent.classList.remove('d-none');
        
        // Add event listener to the error back button
        document.getElementById('error-back-button').addEventListener('click', function() {
            resultsCard.classList.add('d-none');
            backButton.style.display = 'none';
            resetFormState();
            shopUrlInput.focus();
        });
        
        // Reset button state
        resetFormState();
    }
    
    // Initialize input highlighting
    setupInputHighlighting();
});

// Add CSS animation classes to the document
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .shake {
            animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
            10%, 90% { transform: translateX(-1px); }
            20%, 80% { transform: translateX(2px); }
            30%, 50%, 70% { transform: translateX(-4px); }
            40%, 60% { transform: translateX(4px); }
        }
        
        .is-invalid {
            border-color: #dc3545 !important;
            box-shadow: 0 0 0 0.25rem rgba(220, 53, 69, 0.25);
        }
        
        .is-valid {
            border-color: #198754 !important;
        }
        
        #toggle-token.active {
            background-color: #e9ecef;
            transition: background-color 0.3s;
        }
    </style>
`); 