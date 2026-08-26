import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCryptoInvoice } from "@/lib/payments/provider";

const PACKAGES: Record<string, number> = {
  "5": 5,
  "10": 10,
  "25": 25,
  "50": 50,
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const packageKey = String(body.package ?? "");
  const usdAmount = PACKAGES[packageKey];

  if (!usdAmount) {
    return NextResponse.json({ error: "Invalid package" }, { status: 400 });
  }

  const invoice = await createCryptoInvoice({
    userId: user.id,
    usdAmount,
    currency: "USDTTRC20",
  });

  return NextResponse.json({ url: invoice.hostedCheckoutUrl });
}
