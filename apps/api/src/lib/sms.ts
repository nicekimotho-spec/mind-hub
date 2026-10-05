import { env } from "../config/env.js";
import { logger } from "./logger.js";

const BASE_URLS = {
  sandbox: "https://api.sandbox.africastalking.com",
  production: "https://api.africastalking.com",
} as const;

/** Same automatic stub rule as lib/mpesa.ts: without credentials there is nothing this
 * client could correctly send, so it logs instead. */
export function isSmsStubMode(): boolean {
  return !env.AT_USERNAME || !env.AT_API_KEY;
}

interface AfricasTalkingResponse {
  SMSMessageData?: { Recipients?: Array<{ number: string; status: string; statusCode: number }> };
}

/**
 * Sends one SMS via Africa's Talking (PRD §12). Throws if the provider rejects the
 * message, so callers decide whether a failed send should fail their own operation.
 *
 * Message text must never contain clinical content: SMS sits unencrypted on a phone
 * that may be shared, so callers keep it to times and links (see reminders.service.ts).
 */
export async function sendSms(to: string, message: string): Promise<void> {
  if (isSmsStubMode()) {
    logger.info({ to, message }, "SMS (stub mode — no AT_USERNAME/AT_API_KEY configured)");
    return;
  }

  const body = new URLSearchParams({ username: env.AT_USERNAME as string, to, message });
  if (env.AT_SENDER_ID) body.set("from", env.AT_SENDER_ID);

  const res = await fetch(`${BASE_URLS[env.AT_ENV]}/version1/messaging`, {
    method: "POST",
    headers: {
      apiKey: env.AT_API_KEY as string,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`Africa's Talking SMS request failed with status ${res.status}`);
  }

  // A 2xx response can still carry a per-recipient rejection (invalid number, no credit).
  const data = (await res.json()) as AfricasTalkingResponse;
  const recipient = data.SMSMessageData?.Recipients?.[0];
  if (!recipient || recipient.status !== "Success") {
    throw new Error(`Africa's Talking did not accept the SMS (${recipient?.status ?? "no recipient in response"})`);
  }
}
