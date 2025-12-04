const RAW_CASHFREE_ENV = (process.env.CASHFREE_ENV || "TEST").toUpperCase();

export const cashfreeMode =
  RAW_CASHFREE_ENV === "PRODUCTION" || RAW_CASHFREE_ENV === "PROD"
    ? "production"
    : "sandbox";

export function getCashfreeBaseUrl() {
  return cashfreeMode === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

export function getCashfreeCredentials() {
  return {
    appId: process.env.CASHFREE_APP_ID ?? "",
    secretKey: process.env.CASHFREE_SECRET_KEY ?? "",
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

export function getClientPaymentConfig() {
  const { currency, plans } = getCashfreePlanConfig();
  return {
    cashfreeMode,
    currency,
    plans,
  };
}

