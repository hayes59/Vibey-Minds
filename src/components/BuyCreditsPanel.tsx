"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const PACKAGES = [
  { key: "5", usd: 5, credits: 50 },
  { key: "10", usd: 10, credits: 100 },
  { key: "25", usd: 25, credits: 250 },
  { key: "50", usd: 50, credits: 500 },
];

export default function BuyCreditsPanel({
  userId,
  initialBalance,
}: {
  userId: string;
  initialBalance: number;
}) {
  const supabase = createClient();
  const [balance, setBalance] = useState(initialBalance);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live-update the balance the moment the webhook credits a deposit,
  // without the user needing to refresh the page.
  useEffect(() => {
    const channel = supabase
      .channel(`credit_balances:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "credit_balances",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setBalance((payload.new as { balance: number }).balance);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  async function handleBuy(packageKey: string) {
    setLoadingKey(packageKey);
    setError(null);

    try {
      const res = await fetch("/api/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: packageKey }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Something went wrong");

      // eslint-disable-next-line react-hooks/immutability -- external navigation, not a render-time mutation
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoadingKey(null);
    }
  }

  return (
    <div>
      <div className="mb-6 rounded-xl border border-neutral-800 p-4">
        <p className="text-sm text-neutral-400">Your balance</p>
        <p className="text-3xl font-semibold text-pink-400">{balance} credits</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PACKAGES.map((p) => (
          <button
            key={p.key}
            onClick={() => handleBuy(p.key)}
            disabled={loadingKey !== null}
            className="flex flex-col items-center gap-1 rounded-xl border border-neutral-800 p-4 hover:border-pink-400 disabled:opacity-50"
          >
            <span className="text-lg font-semibold">${p.usd}</span>
            <span className="text-xs text-neutral-500">{p.credits} credits</span>
            {loadingKey === p.key && (
              <span className="text-xs text-pink-400">Redirecting…</span>
            )}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <p className="mt-4 text-xs text-neutral-500">
        Paying with USDT (TRC-20). You&apos;ll be redirected to a secure
        hosted payment page to send crypto from your own wallet or exchange.
      </p>
    </div>
  );
}
