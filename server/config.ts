// =====================================================
// RAZORPAY CONFIGURATION (Version 2)
// =====================================================

export function getRazorpayCredentials() {
  return {
    keyId: (process.env.RAZORPAY_KEY_ID ?? "").trim(),
    keySecret: (process.env.RAZORPAY_KEY_SECRET ?? "").trim(),
  };
}

export function getRazorpayPlanConfig() {
  return {
    currency: "INR",
    plans: {
      daily: 19,   // ₹19 = 1900 paise
      weekly: 49, // ₹49 = 4900 paise
    },
  };
}

export function getClientPaymentConfig() {
  const { currency, plans } = getRazorpayPlanConfig();
  return {
    paymentProvider: 'razorpay',
    currency,
    plans,
  };
}

// =====================================================
// CASHFREE CONFIGURATION (Legacy - Kept for reference)
// =====================================================

const RAW_CASHFREE_ENV = (process.env.CASHFREE_ENV || "TEST").toUpperCase();
const SECRET_KEY = process.env.CASHFREE_SECRET_KEY || "";

// Auto-detect production mode if key says "prod" or env var says "PRODUCTION"
// Force Production unless explicitly set to TEST
export const cashfreeMode = process.env.CASHFREE_ENV === "TEST" ? "sandbox" : "production";

export function getCashfreeBaseUrl() {
  const currentMode = process.env.CASHFREE_ENV === "TEST" ? "sandbox" : "production";
  return currentMode === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

export function getCashfreeCredentials() {
  return {
    appId: (process.env.CASHFREE_APP_ID ?? "").trim(),
    secretKey: (process.env.CASHFREE_SECRET_KEY ?? "").trim(),
  };
}

export function getCashfreePlanConfig() {
  return {
    currency: "INR",
    plans: {
      daily: 19,
      weekly: 49,
    },
  };
}

// =====================================================
// UDO WHATSAPP CONFIGURATION
// =====================================================

export function getUDOWhatsAppConfig() {
  return {
    apiKey: (process.env.UDO_API_KEY ?? "").trim(),
    whatsappNumber: (process.env.UDO_WHATSAPP_NUMBER ?? "").trim(),
    hookbackTemplateName: (process.env.UDO_HOOKBACK_TEMPLATE_NAME ?? "hookback_inactive_user").trim(),
    inactiveDaysThreshold: parseInt(process.env.HOOKBACK_INACTIVE_DAYS || "3", 10),
  };
}

