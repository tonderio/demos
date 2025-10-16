// Checkout data configuration
const checkoutData = {
    "customer": {
        "first_name": "first name",
        "last_name": "last name",
        "email": "test@testuser.com"
    },
    "amount_total": 0,
    "currency": "MXN",
    "external_id": "123-trx-merchant",
    "line_items": [
        {
            "name": "Deposit",
            "quantity": 1,
            "unit_price": 20,
            "product_id": "your internal product id"
        }
    ],
    "payment_method_types": [
        "card",
        "oxxopay",
        "spei",
        // add more payment methods as needed
    ],
    "return_url": "https://tonder.io/es"
    // ...more options
};

let selectedMethod = null;
let checkoutUrl = null;

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", async function () {
    // Add event listeners to all deposit method buttons
    const depositButtons = document.querySelectorAll('.deposit-method-btn');
    depositButtons.forEach(button => {
        button.addEventListener('click', function() {
            handleDepositClick(this.id);
        });
    });
});

async function createCheckoutSession(amount, method) {
    // Determine payment methods based on selection
    let paymentMethods;
    if (method === 'all-methods') {
        paymentMethods = [
            "card",
            "mercadopago",
            "oxxopay",
            "spei",
            "safetypayCash",
            "safetypayTransfer"
        ];
    } else {
        paymentMethods = [method];
    }

    // Update checkout data with the amount
    const requestData = {
        ...checkoutData,
        amount_total: amount,
        payment_method_types: paymentMethods,
        line_items: [
            {
                ...checkoutData.line_items[0],
                unit_price: amount
            }
        ]
    };

    try {
        console.log('Sending POST request to Tonder API...');
        console.log('Request data:', requestData);

        // WARNING: API key should NOT be exposed in frontend code
        // This should be called from your backend server
        const response = await fetch('https://api-stage.tonder.io/checkout/v1/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': "Token 11e3d3c3e95e0eaabbcae61ebad34ee5f93c3d27",
                // 'x-idempotency-key': 'unique-key-' // Optional: Ensure unique key for each request
            },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();
        console.log('API Response:', result);

        // Capture and return the URL from the response
        if (result && result.url) {
            console.log('Checkout URL captured:', result.url);
            return result.url;
        } else {
            console.error('No URL found in response');
            return null;
        }
    } catch (error) {
        console.error('Error making POST request:', error);
        throw error;
    }
}

// Handle deposit button click
async function handleDepositClick(method) {
    selectedMethod = method;
    let amount = document.getElementById("amountInput").value;
    amount = parseFloat(amount);

    try {
        const iframe = document.getElementById('tonder-checkout-iframe');
        // clear previous iframe src to reset state
        if (iframe) {
            iframe.src = 'about:blank';
        }

        checkoutUrl = await createCheckoutSession(amount, method);

        if (checkoutUrl) {
            // Show the payment iframe with the captured URL
            await showPaymentIframe();
        } else {
            alert('Error: Could not retrieve payment URL');
        }
    } catch (error) {
        alert('Error processing payment: ' + error.message);
    }
}

async function showPaymentIframe() {
    const paymentTabTrigger = document.querySelector("#payment-tab");
    if (paymentTabTrigger && window.bootstrap && bootstrap.Tab) {
        const tab = new bootstrap.Tab(paymentTabTrigger);
        tab.show();

        // Update iframe src with the checkout URL
        const iframe = document.getElementById('tonder-checkout-iframe');
        if (iframe && checkoutUrl) {
            iframe.src = checkoutUrl;
        }
    }
}