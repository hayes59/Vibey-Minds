import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { verifyWebhookSignature } from "@/lib/payments/provider";

// 1 credit == $0.10 of deposit, adjust to taste.
const CREDITS_PER_USD = 10;

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-provider-signature");

  let verified: boolean;
  try {
    verified = await verifyWebhookSignature(rawBody, signature);
  } catch (err) {
    console.error("Webhook verification not configured:", err);
    return NextResponse.json(
      { error: "Webhook verification not configured" },
      { status: 500 }
    );
  }

  if (!verified) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Replace this parsing with your provider's actual payload shape.
  // Expected shape here: { invoice_id, order_id (userId), price_amount, status }
  const event = JSON.parse(rawBody) as {
    invoice_id: string;
    order_id: string;
    price_amount: number;
    status: "confirmed" | "pending" | "failed";
  };

  if (event.status !== "confirmed") {
    return NextResponse.json({ received: true });
  }

  const credits = Math.round(event.price_amount * CREDITS_PER_USD);
  const supabase = createServiceRoleClient();

  const { error } = await supabase.rpc("apply_credit_transaction", {
    p_user_id: event.order_id,
    p_amount: credits,
    p_kind: "crypto_deposit",
    p_provider: "dev-provider",
    p_provider_ref: event.invoice_id,
  });

  if (error) {
    console.error("Failed to apply credit transaction:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
