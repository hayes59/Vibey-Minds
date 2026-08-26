"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * Stand-in for a real crypto payment processor's hosted checkout page.
 * Only reachable in development (see provider.ts), when
 * CRYPTO_PROVIDER_API_KEY isn't set. It calls your own webhook directly to
 * simulate "payment confirmed," purely so you can see the full deposit ->
 * credits flow locally. Delete this route once a real provider is wired up.
 */
export default function DevCheckoutPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  );

  const invoice = params.get("invoice") ?? "";
  const userId = params.get("user") ?? "";
  const amount = Number(params.get("amount") ?? "0");

  async function simulatePayment() {
    setStatus("sending");
    try {
      const res = await fetch("/api/credits/webhook", {
        method: "POST",
        body: JSON.stringify({
          invoice_id: invoice,
          order_id: userId,
          price_amount: amount,
          status: "confirmed",
        }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
      setTimeout(() => router.push("/credits"), 1200);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Dev checkout simulator</h1>
      <p className="text-sm text-neutral-400">
        In production this would be your payment provider&apos;s hosted page
        showing a USDT deposit address and QR code for ${amount}.
      </p>
      <button
        onClick={simulatePayment}
        disabled={status === "sending" || status === "done"}
        className="rounded-full bg-pink-500 px-4 py-2 font-medium text-white hover:bg-pink-400 disabled:opacity-50"
      >
        {status === "idle" && "Simulate payment confirmed"}
        {status === "sending" && "Confirming…"}
        {status === "done" && "Credited! Redirecting…"}
        {status === "error" && "Failed — try again"}
      </button>
    </div>
  );
}
