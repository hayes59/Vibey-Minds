import "server-only";

/**
 * Thin abstraction over a hosted crypto payment processor (NOWPayments,
 * Coinbase Commerce, BTCPay Server, etc). Swap the body of these two
 * functions for real API calls once you've picked a provider — everything
 * else in the app (checkout route, webhook route, credits UI) stays the
 * same.
 *
 * Why go through a processor instead of generating/holding addresses and
 * private keys yourself: address generation, confirmation-tracking, reorg
 * handling, and key custody are all easy to get subtly wrong in ways that
 * lose customer funds, and a compromised server becomes a direct wallet
 * drain. A processor takes on that surface area and typically also runs
 * the sanctions/AML screening you'd otherwise need to build yourself.
 */

export type CreateInvoiceParams = {
  userId: string;
  usdAmount: number; // e.g. 10.00
  currency: "USDTTRC20" | "USDTERC20" | "ETH";
};

export type Invoice = {
  id: string; // provider's invoice/payment id — store as provider_ref
  hostedCheckoutUrl: string; // redirect the user here to pay
};

export async function createCryptoInvoice(
  params: CreateInvoiceParams
): Promise<Invoice> {
  const apiKey = process.env.CRYPTO_PROVIDER_API_KEY;

  if (!apiKey) {
    // Placeholder so the app runs end-to-end locally before you've signed
    // up with a provider. Replace this block with, e.g.:
    //
    //   const res = await fetch("https://api.nowpayments.io/v1/invoice", {
    //     method: "POST",
    //     headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       price_amount: params.usdAmount,
    //       price_currency: "usd",
    //       pay_currency: params.currency,
    //       order_id: params.userId,
    //       ipn_callback_url: `${process.env.APP_URL}/api/credits/webhook`,
    //     }),
    //   });
    //   const data = await res.json();
    //   return { id: data.id, hostedCheckoutUrl: data.invoice_url };
    //
    const fakeId = `dev-${Date.now()}`;
    return {
      id: fakeId,
      hostedCheckoutUrl: `/credits/dev-checkout?invoice=${fakeId}&user=${params.userId}&amount=${params.usdAmount}`,
    };
  }

  throw new Error(
    "CRYPTO_PROVIDER_API_KEY is set but createCryptoInvoice() hasn't been " +
      "wired up to a real provider yet — see the comment above."
  );
}

/**
 * Verifies an inbound webhook actually came from your payment provider.
 * Every provider signs its webhooks (HMAC over the raw body, usually) —
 * replace this with their documented verification method. Skipping
 * verification lets anyone POST a fake "payment confirmed" event and
 * mint themselves free credits.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  const secret = process.env.CRYPTO_PROVIDER_WEBHOOK_SECRET;
  if (!secret) {
    // Dev mode only. Refuse to run "verified" webhooks in production
    // without a real secret configured.
    return process.env.NODE_ENV !== "production";
  }

  if (!signatureHeader) return false;

  // Generic HMAC-SHA512-over-raw-body check, the scheme NOWPayments' IPN
  // uses. If you pick a different provider, check their docs — some sign a
  // JSON-sorted-keys string instead of the raw body, or use SHA-256.
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const digest = createHmac("sha512", secret).update(rawBody).digest("hex");

  const a = Buffer.from(digest, "hex");
  const b = Buffer.from(signatureHeader, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
