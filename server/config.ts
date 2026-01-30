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
      daily: 29,   // ₹29 = 2900 paise
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
      daily: 29,  // ₹29 for daily pass
      weekly: 49, // ₹49 for weekly pass
    },
  };
}

// =====================================================
// DODO PAYMENTS CONFIGURATION
// =====================================================

/** When false, Dodo SDK is not loaded and webhook returns 200 without verification. */
export const DODO_ENABLED =
  !!(process.env.DODO_PAYMENTS_API_KEY?.trim()) && !!(process.env.DODO_WEBHOOK_SECRET?.trim());

export function getDodoPlanConfig() {
  return {
    currency: "INR",
    plans: {
      monthly: 99,  // ₹99 per month
    },
  };
}

export function getDodoCredentials() {
  return {
    apiKey: (process.env.DODO_PAYMENTS_API_KEY ?? "").trim(),
    webhookSecret: (process.env.DODO_WEBHOOK_SECRET ?? "").trim(),
    environment: (process.env.DODO_ENV || '').trim() === 'live_mode' ? 'live_mode' : 'test_mode',
  };
}
