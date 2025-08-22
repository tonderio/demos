// Checkout data configuration
const checkoutData = {
  customer: {
    firstName: "Adrian",
    lastName: "Martinez",
    country: "Mexico",
    address: "Pinos 507, Col El Tecuan",
    city: "Durango",
    state: "Durango",
    postCode: "34105",
    email: "adrian@email.com",
    phone: "8161234567",
    identification: {
      type: "CPF",
      number: "19119119100",
    },
  },
  currency: "mxn",
  cart: {
    total: 399,
    items: [
      {
        description: "Black T-Shirt",
        quantity: 1,
        price_unit: 1,
        discount: 0,
        taxes: 0,
        product_reference: 1,
        name: "T-Shirt",
        amount_total: 399,
      },
    ],
  },
  metadata: { order_id: "ORD-123456" },
  order_reference: "ORD-123456",
  apm_config: {},
};

// Global variables
let selectedMethod = null;
let amount = null;

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", async function () {
  // Add event listeners to all payment method buttons
  const paymentMethodButtons = document.querySelectorAll(".deposit-method-btn");

  paymentMethodButtons.forEach((button) => {
    button.addEventListener("click", function (event) {
      handleDepositClick(event.target.id);
    });
  });
});

// Handle deposit button click
async function handleDepositClick(method) {
  console.log("Selected payment method:", method);
  console.log("Amount entered:", amountInput.value);
  selectedMethod = method;
  amount = document.getElementById("amountInput").value;

  // Validation
  if (!selectedMethod) {
    return alert("Select a payment method");
  }
  if (!amount) {
    return alert("Enter an amount");
  }
  amount = parseFloat(amountInput.value);

  // Validate amount is a positive number
  if (isNaN(amount) || amount <= 0) {
    return alert("Please enter a valid amount");
  }

  await showCardForm();
  if (selectedMethod !== "card") {
    loadAPMPaymentIframe();
  } else {
    loadCardPaymentIframe();
  }
}

async function showCardForm() {
  const paymentTabTrigger = document.querySelector("#payment-tab");
  if (paymentTabTrigger && window.bootstrap && bootstrap.Tab) {
    const tab = new bootstrap.Tab(paymentTabTrigger);
    tab.show();
  }
}

function loadAPMPaymentIframe() {
  const iframe = document.getElementById("iframe_tonder_sdk");
  iframe.style.setProperty("display", "block", "important");

  iframe.style.width = "100%";
  iframe.style.height = "600px";
  iframe.style.border = "0";
  const qs = new URLSearchParams({
    method: selectedMethod,
    amount: String(amount),
    checkoutData: encodeURIComponent(JSON.stringify(checkoutData)),
  });

  iframe.src = `apm_payment.html?${qs.toString()}`;
}

function loadCardPaymentIframe() {
  const iframe = document.getElementById("iframe_tonder_sdk");
  iframe.style.setProperty("display", "block", "important");
  iframe.style.width = "100%";
  iframe.style.height = "600px";
  iframe.style.border = "0";

  // Define how you want to pass these parameters to the iframe — this is up to your implementation.
  // In this example, they are serialized and sent via URL query string.
  // You could also use alternatives like postMessage, localStorage, or a backend session.
  const qs = new URLSearchParams({
    method: selectedMethod,
    amount: String(amount),
    checkoutData: encodeURIComponent(JSON.stringify(checkoutData)),
  });

  iframe.src = `card_payment.html?${qs.toString()}`;
}
