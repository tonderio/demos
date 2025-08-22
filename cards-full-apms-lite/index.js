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
// Tonder Lite SDK instance
let liteSDK = null;
// Tonder Full SDK instance
let fullSDK = null;

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", async function () {
  // Get URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const tonderPaymentId = urlParams.get("tndr_payment_id");

  // Validate if the current page load is the result of a redirect
  // from a 3DS authentication or a voucher payment
  if (tonderPaymentId) {
    await createTonderLiteInstance();
    // This validation (verify3dsTransaction) is optional and only needed if you want to display a message
    // right after the first redirect (3DS or voucher).
    // It only works on the very first redirect — if the page is reloaded afterwards,
    // this function will not return any response.
    // If you already have your own confirmation mechanism (e.g., Tonder webhooks, static/validation returnUrl, etc.),
    // you don’t need to call this function.
    liteSDK.verify3dsTransaction().then((res) => {
      validateTransactionStatus(res);
    });
  }

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

  if (selectedMethod !== "card") {
    // create a lite Tonder instance only for APM payments
    await createTonderLiteInstance();

    await handleLitePayment(selectedMethod);
  } else {
    await showCardForm();
  }
}

async function handleLitePayment() {
  // Create payment data with an updated amount and selected method
  let data = {
    ...checkoutData,
    cart: {
      ...checkoutData.cart,
      total: amount, // Update total with the entered amount
      items: [{ ...checkoutData.cart.items[0], amount_total: amount }], // Update total with the entered amount
    },
    payment_method: selectedMethod,
  };

  const payBtn = document.getElementById(selectedMethod);
  try {
    if (payBtn) {
      payBtn.textContent = "Procesando...";
      payBtn.disabled = true;
    }

    const res = await liteSDK.payment(data);
    console.log("Payment response:", res);

    document.getElementById("depositModal").style.display = "none";
  } catch (err) {
    console.error("Payment error:", err);
    alert("Payment failed");
  } finally {
    if (payBtn) {
      payBtn.textContent = "DEPOSITAR";
      payBtn.disabled = false;
    }
  }
}

async function showCardForm() {
  const paymentTabTrigger = document.querySelector("#payment-tab");
  if (paymentTabTrigger && window.bootstrap && bootstrap.Tab) {
    const tab = new bootstrap.Tab(paymentTabTrigger);
    tab.show();

    // create a full Tonder instance only for card payments
    await createTonderFullInstance();
  }
}

// create a new instance of Tonder LITE Checkout
async function createTonderLiteInstance() {
  liteSDK = new TonderSdk.LiteInlineCheckout({
    mode: "stage",
    apiKey: "11e3d3c3e95e0eaabbcae61ebad34ee5f93c3d27",
    returnUrl: window.location.href,
    // This callback is triggered only when the payment flow finishes with
    // a "Success" or "Declined" status, without requiring 3DS authentication.
    callBack: async (response) => {
      console.log("Payment response LITE SDK");
      validateTransactionStatus(response);
    },
  });
  await liteSDK.injectCheckout();

  return liteSDK;
}

// create a new instance of Tonder FULL Checkout
async function createTonderFullInstance() {
  fullSDK = new TonderSdk.InlineCheckout({
    mode: "stage",
    apiKey: "11e3d3c3e95e0eaabbcae61ebad34ee5f93c3d27",
    returnUrl: window.location.href,
    // This callback is triggered only when the payment flow finishes with
    // a "Success" or "Declined" status, without requiring 3DS authentication.
    callBack: async (response) => {
      console.log("Payment response Full SDK");
      validateTransactionStatus(response);
    },
    customization: {
      displayMode: "light", // Set the UI theme (light or dark)
      saveCards: {
        showSaveCardOption: false, // Show/hide the "save card for future payments" checkbox
        autoSave: false, // Automatically save the card without displaying the checkbox
        showSaved: false, // Show/hide the list of previously saved cards
      },
      paymentButton: {
        show: true, // Show/hide the payment button
        showAmount: true, // Display the payment amount next to the button text
        text: "Depositar", // Customize the payment button text
      },
      cancelButton: {
        show: false, // Show/hide the cancel button
        text: "Cancel", // Customize the cancel button text
      },
      paymentMethods: {
        show: false, // Show/hide the list of available payment methods
      },
      cardForm: {
        show: true, // Show/hide the card form
      },
    },
  });

  // Include the secureToken only when using the "saved cards" feature.
  // This token is required to authorize the use of previously stored cards
  // or to save new cards.
  await fullSDK.configureCheckout({
    ...checkoutData,
    cart: {
      ...checkoutData.cart,
      total: amount, // Update total with the entered amount
      items: [{ ...checkoutData.cart.items[0], amount_total: amount }], // Update total with the entered amount
    },
    secureToken: "eyJhbGc...", // Replace it with a valid secure token (recommended to get it from your backend)
  });

  await fullSDK.injectCheckout();
  return fullSDK;
}

function validateTransactionStatus(transaction) {
  if (!transaction) return;
  console.log("Payment response", transaction);
  if (transaction.error) {
    console.log("Payment error", transaction.error);
    alert("Payment failed");
    return;
  }

  if (transaction.transaction_status === "Pending") {
    // Pending status only for voucher payments
    alert(
      "Payment initiated successfully! Please complete the payment process using the provided instructions (payment voucher). Your transaction will be confirmed once the payment is completed.",
    );
  } else if (transaction.transaction_status === "Success") {
    alert("Payment successful");
  } else if (transaction.transaction_status === "Declined") {
    alert("Payment declined");
  }
}
