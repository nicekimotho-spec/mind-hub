import crypto from "node:crypto";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

const BASE_URLS = {
  sandbox: "https://sandbox.safaricom.co.ke",
  production: "https://api.safaricom.co.ke",
} as const;

/**
 * Stub mode is automatic, not a manual toggle: without real Safaricom credentials
 * there is nothing else this client could correctly do. This mirrors the OTP/SMS stub
 * pattern in auth.service.ts — the integration point is real and correctly shaped, but
 * the network call is skipped until real credentials are configured (PRD §12).
 */
function isStubMode(): boolean {
  return !env.MPESA_CONSUMER_KEY || !env.MPESA_CONSUMER_SECRET || !env.MPESA_PASSKEY;
}

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(`${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`).toString("base64");
  const res = await fetch(`${BASE_URLS[env.MPESA_ENV]}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!res.ok) {
    throw new Error(`M-Pesa OAuth request failed with status ${res.status}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function buildTimestamp(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function buildPassword(timestamp: string): string {
  return Buffer.from(`${env.MPESA_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`).toString("base64");
}

export interface StkPushRequest {
  phone: string; // already normalized to +254XXXXXXXXX by the caller
  amountKES: number;
  accountReference: string;
  transactionDesc: string;
}

export interface StkPushResult {
  checkoutRequestId: string;
  merchantRequestId: string;
}

/**
 * Initiates an STK push (the "enter your M-Pesa PIN" prompt on the client's phone).
 * The actual payment result never comes back from this call — it arrives later via
 * POST /payments/mpesa/callback, exactly as Safaricom's real API works. In stub mode,
 * this synthesizes a plausible-looking ack immediately so the rest of the flow
 * (payment record, correlation by CheckoutRequestID) is fully exercised without a
 * network call; the actual PENDING -> SUCCEEDED/FAILED transition still only happens
 * when something calls the callback endpoint, matching real Daraja behavior.
 */
export async function initiateStkPush(request: StkPushRequest): Promise<StkPushResult> {
  const mpesaPhone = request.phone.replace(/^\+/, ""); // Daraja expects 2547XXXXXXXX, no leading +

  if (isStubMode()) {
    const stubId = crypto.randomUUID();
    logger.info(
      { ...request, checkoutRequestId: stubId },
      "M-Pesa STK push (stub mode — no MPESA_CONSUMER_KEY/SECRET/PASSKEY configured)",
    );
    return { checkoutRequestId: `stub-${stubId}`, merchantRequestId: `stub-${stubId}` };
  }

  const accessToken = await getAccessToken();
  const timestamp = buildTimestamp(new Date());
  const password = buildPassword(timestamp);

  const res = await fetch(`${BASE_URLS[env.MPESA_ENV]}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: request.amountKES,
      PartyA: mpesaPhone,
      PartyB: env.MPESA_SHORTCODE,
      PhoneNumber: mpesaPhone,
      CallBackURL: env.MPESA_CALLBACK_URL,
      AccountReference: request.accountReference,
      TransactionDesc: request.transactionDesc,
    }),
  });

  if (!res.ok) {
    throw new Error(`M-Pesa STK push request failed with status ${res.status}`);
  }
  const data = (await res.json()) as { CheckoutRequestID: string; MerchantRequestID: string };
  return { checkoutRequestId: data.CheckoutRequestID, merchantRequestId: data.MerchantRequestID };
}

/** Shape of the payload Safaricom POSTs to our callback URL. */
export interface MpesaStkCallbackPayload {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{ Name: string; Value?: string | number }>;
      };
    };
  };
}

export interface ParsedMpesaCallback {
  checkoutRequestId: string;
  succeeded: boolean;
  resultDesc: string;
  mpesaReceiptNumber?: string;
  amount?: number;
}

export function parseMpesaCallback(payload: MpesaStkCallbackPayload): ParsedMpesaCallback {
  const callback = payload.Body.stkCallback;
  const items = callback.CallbackMetadata?.Item ?? [];
  const findItem = (name: string) => items.find((item) => item.Name === name)?.Value;

  return {
    checkoutRequestId: callback.CheckoutRequestID,
    succeeded: callback.ResultCode === 0,
    resultDesc: callback.ResultDesc,
    mpesaReceiptNumber: findItem("MpesaReceiptNumber") as string | undefined,
    amount: findItem("Amount") as number | undefined,
  };
}
