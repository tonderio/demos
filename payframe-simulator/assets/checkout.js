(function () {
  function applyThemeVars(root) {
    var docStyle = document.documentElement.style;

    if (root.dataset.themePrimary) {
      docStyle.setProperty("--pf-primary", root.dataset.themePrimary);
    }
    if (root.dataset.themeGradStart) {
      docStyle.setProperty("--pf-grad-start", root.dataset.themeGradStart);
    }
    if (root.dataset.themeGradEnd) {
      docStyle.setProperty("--pf-grad-end", root.dataset.themeGradEnd);
    }
  }

  function buildReturnUrl(base, status, orderId) {
    try {
      var url = new URL(base);
      url.searchParams.set("status", status);
      url.searchParams.set("orderId", orderId);
      return url.toString();
    } catch (_err) {
      var sep = base.indexOf("?") >= 0 ? "&" : "?";
      return (
        base +
        sep +
        "status=" +
        encodeURIComponent(status) +
        "&orderId=" +
        encodeURIComponent(orderId)
      );
    }
  }

  function showError(container, message) {
    container.classList.remove("is-hidden");
    container.textContent = "";

    var wrapper = document.createElement("div");
    wrapper.className = "error-message";
    wrapper.textContent = "❌ " + message;
    container.appendChild(wrapper);
  }

  function initHostedCheckout() {
    var root = document.getElementById("checkout-root");
    var iframe = document.getElementById("checkout-iframe");
    var loading = document.getElementById("loading");
    var errorContainer = document.getElementById("error-container");

    if (!root || !iframe || !loading || !errorContainer) {
      return;
    }

    applyThemeVars(root);

    var checkoutUrl = root.dataset.checkoutUrl || "";
    var returnUrl = root.dataset.returnUrl || "";
    var orderId = root.dataset.orderId || "";
    var gatewayOrigin = root.dataset.gatewayOrigin || "";
    var droppedMessageOrigins = {};

    function warnDroppedPostMessage(origin) {
      var key = origin || "<missing>";
      if (droppedMessageOrigins[key]) {
        return;
      }
      droppedMessageOrigins[key] = true;

      if (window.console && typeof window.console.warn === "function") {
        window.console.warn("[checkout] dropped postMessage origin", {
          origin: origin || null,
          expectedOrigin: gatewayOrigin || null,
        });
      }
    }

    iframe.onload = function () {
      loading.classList.add("is-hidden");
      iframe.classList.remove("is-hidden");
    };

    iframe.onerror = function () {
      loading.classList.add("is-hidden");
      showError(
        errorContainer,
        "No se pudo cargar el checkout. Por favor, intenta nuevamente o contacta soporte.",
      );
    };

    window.addEventListener("message", function (event) {
      if (!gatewayOrigin || event.origin !== gatewayOrigin) {
        warnDroppedPostMessage(event.origin);
        return;
      }

      var data = event.data || {};
      if (!data || typeof data !== "object") {
        return;
      }

      if (data.type === "payment.success") {
        window.location.href = buildReturnUrl(returnUrl, "success", orderId);
        return;
      }

      if (data.type === "payment.failed") {
        showError(
          errorContainer,
          data.message || "El pago no pudo ser procesado",
        );
        return;
      }

      if (data.type === "payment.cancelled") {
        window.location.href = buildReturnUrl(returnUrl, "cancelled", orderId);
      }
    });

    setTimeout(function () {
      if (!loading.classList.contains("is-hidden")) {
        loading.textContent =
          "⏱️ La carga está tomando más tiempo de lo esperado...";
      }
    }, 15000);

    iframe.setAttribute("src", checkoutUrl);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initHostedCheckout);
  } else {
    initHostedCheckout();
  }
})();
