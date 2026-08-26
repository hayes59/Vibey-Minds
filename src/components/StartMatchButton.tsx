"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function StartMatchButton({
  currentUserId,
  otherUserId,
}: {
  currentUserId: string;
  otherUserId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);

    const { data, error } = await supabase
      .from("matches")
      .insert({
        user_a: currentUserId,
        user_b: otherUserId,
        status: "active",
      })
      .select("id")
      .single();

    setLoading(false);

    if (!error && data) {
      router.push(`/chat/${data.id}`);
    } else {
      router.refresh();
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="mt-1 self-start rounded-full bg-pink-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-pink-400 disabled:opacity-50"
    >
      {loading ? "Starting…" : "Start chat"}
    </button>
  );
}
