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

  // create a new instance of Tonder Lite SDK
  await createTonderLiteInstance();
  if (selectedMethod !== "card") {
    await handlePayment(selectedMethod);
  } else {
    showCardForm();
  }
}

async function handlePayment(buttonId = "") {
  // Create payment data with an updated amount and selected method
  let data = {
    ...checkoutData,
    cart: {
      ...checkoutData.cart,
      total: amount, // Update total with the entered amount
      items: [{ ...checkoutData.cart.items[0], amount_total: amount }], // Update total with the entered amount
    },
  };

  if (selectedMethod === "card") {
    const validCardForm = validateCardForm();
    if (!validCardForm) return alert("Please complete the card form correctly");
    data["card"] = {
      card_number: document.getElementById("cardNumber").value,
      cvv: document.getElementById("cvv").value,
      expiration_month: document.getElementById("expMonth").value,
      expiration_year: document.getElementById("expYear").value,
      cardholder_name: document.getElementById("cardHolder").value,
    };
  } else {
    data["payment_method"] = selectedMethod;
  }

  const payBtn = document.getElementById(buttonId);
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

function showCardForm() {
  const paymentTabTrigger = document.querySelector("#payment-tab");
  if (paymentTabTrigger && window.bootstrap && bootstrap.Tab) {
    const tab = new bootstrap.Tab(paymentTabTrigger);
    tab.show();

    // Add event listeners to modal deposit button
    const modalDepositButton = document.getElementById("card_deposit");
    modalDepositButton.addEventListener("click", async function (event) {
      await handlePayment("card_deposit");
    });
  } else {
    paymentTabTrigger?.click();
  }
}

function validateCardForm() {
  const form = document.getElementById("cardPaymentForm");
  if (form) {
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return false;
    }
    form.classList.add("was-validated");
    return true;
  }
}

async function createTonderLiteInstance() {
  // create a new instance of Tonder Lite Checkout
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
