import { describe, expect, it } from "vitest";
import { initiateStkPush, parseMpesaCallback, type MpesaStkCallbackPayload } from "./mpesa.js";

describe("initiateStkPush (stub mode — no MPESA_* credentials configured in test env)", () => {
  it("returns a synthesized checkout request id without making a network call", async () => {
    const result = await initiateStkPush({
      phone: "+254712345678",
      amountKES: 2500,
      accountReference: "booking-123",
      transactionDesc: "Mind Hub session",
    });
    expect(result.checkoutRequestId).toMatch(/^stub-/);
    expect(result.merchantRequestId).toMatch(/^stub-/);
  });

  it("returns a distinct id on each call", async () => {
    const a = await initiateStkPush({ phone: "+254712345678", amountKES: 100, accountReference: "a", transactionDesc: "a" });
    const b = await initiateStkPush({ phone: "+254712345678", amountKES: 100, accountReference: "b", transactionDesc: "b" });
    expect(a.checkoutRequestId).not.toBe(b.checkoutRequestId);
  });
});

function buildCallback(overrides: Partial<MpesaStkCallbackPayload["Body"]["stkCallback"]> = {}): MpesaStkCallbackPayload {
  return {
    Body: {
      stkCallback: {
        MerchantRequestID: "merchant-1",
        CheckoutRequestID: "checkout-1",
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        CallbackMetadata: {
          Item: [
            { Name: "Amount", Value: 2500 },
            { Name: "MpesaReceiptNumber", Value: "NLJ7RT61SV" },
            { Name: "TransactionDate", Value: 20260916102115 },
            { Name: "PhoneNumber", Value: 254712345678 },
          ],
        },
        ...overrides,
      },
    },
  };
}

describe("parseMpesaCallback", () => {
  it("parses a successful callback, extracting the receipt number and amount", () => {
    const result = parseMpesaCallback(buildCallback());
    expect(result.succeeded).toBe(true);
    expect(result.checkoutRequestId).toBe("checkout-1");
    expect(result.mpesaReceiptNumber).toBe("NLJ7RT61SV");
    expect(result.amount).toBe(2500);
  });

  it("parses a failed callback (e.g. user cancelled the STK prompt) with no metadata", () => {
    const failed = buildCallback({
      ResultCode: 1032,
      ResultDesc: "Request cancelled by user",
      CallbackMetadata: undefined,
    });
    const result = parseMpesaCallback(failed);
    expect(result.succeeded).toBe(false);
    expect(result.resultDesc).toBe("Request cancelled by user");
    expect(result.mpesaReceiptNumber).toBeUndefined();
  });
});
