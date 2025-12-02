export interface PaymentEventLog {
  orderId: string;
  event: "created" | "success" | "failed" | "user_dropped" | "webhook_retry";
  payload?: Record<string, any>;
}

export function logPaymentEvent(entry: PaymentEventLog) {
  const timestamp = new Date().toISOString();
  console.log(
    `[cashfree][${timestamp}] ${entry.event.toUpperCase()} order=${entry.orderId} payload=${JSON.stringify(entry.payload ?? {})}`,
  );
}


