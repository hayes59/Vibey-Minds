import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BuyCreditsPanel from "@/components/BuyCreditsPanel";
import NowPaymentsButton from "@/components/NowPaymentsButton";

export default async function CreditsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: balanceRow } = await supabase
    .from("credit_balances")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: transactions } = await supabase
    .from("credit_transactions")
    .select("id, amount, kind, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-semibold">Credits</h1>
      <p className="mb-8 text-neutral-400">
        Buy credits with USDT to unlock paid conversations. Send crypto from
        any wallet or exchange you already use — nothing to buy here with a
        card.
      </p>

      <BuyCreditsPanel
        userId={user.id}
        initialBalance={balanceRow?.balance ?? 0}
      />

      <div className="mt-6 flex items-center gap-3 text-xs text-neutral-500">
        <div className="h-px flex-1 bg-neutral-800" />
        or
        <div className="h-px flex-1 bg-neutral-800" />
      </div>

      <div className="mt-6 flex flex-col items-start gap-2">
        <NowPaymentsButton />
        <p className="text-xs text-neutral-500">
          This button opens a NOWPayments-hosted page for a fixed amount.
          It doesn&apos;t know which vibeyminds account is paying, so it
          won&apos;t auto-credit your balance the way the packages above do
          — use it for a one-off payment, then let us know the transaction
          if you need it applied manually.
        </p>
      </div>

      <h2 className="mt-10 mb-3 text-lg font-semibold text-neutral-300">
        Recent activity
      </h2>
      <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
        {(transactions ?? []).length === 0 && (
          <li className="px-4 py-3 text-sm text-neutral-500">
            No activity yet.
          </li>
        )}
        {(transactions ?? []).map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between px-4 py-3 text-sm"
          >
            <span className="text-neutral-300">
              {t.kind.replace("_", " ")}
            </span>
            <span
              className={t.amount >= 0 ? "text-green-400" : "text-neutral-400"}
            >
              {t.amount >= 0 ? "+" : ""}
              {t.amount}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
