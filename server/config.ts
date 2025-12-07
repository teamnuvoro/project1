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
      daily: 29,
      weekly: 99,
    },
  };
}

export function getClientPaymentConfig() {
  const { currency, plans } = getCashfreePlanConfig();
  return {
    cashfreeMode,
    currency,
    plans,
  };
}

