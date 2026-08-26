import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StartMatchButton from "@/components/StartMatchButton";
import type { Profile } from "@/types/database";

export default async function MatchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: myMatches } = await supabase
    .from("matches")
    .select("id, user_a, user_b, status, created_at")
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const matchedUserIds = new Set(
    (myMatches ?? []).map((m) => (m.user_a === user.id ? m.user_b : m.user_a))
  );

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, bio, avatar_url, role, is_online, rate_per_message, created_at")
    .neq("id", user.id)
    .order("is_online", { ascending: false });

  const profileById = new Map<string, Profile>(
    (profiles ?? []).map((p) => [p.id, p as Profile])
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Your matches</h1>

      {myMatches && myMatches.length > 0 && (
        <ul className="mb-10 divide-y divide-neutral-800 rounded-xl border border-neutral-800">
          {myMatches.map((m) => {
            const otherId = m.user_a === user.id ? m.user_b : m.user_a;
            const other = profileById.get(otherId);
            return (
              <li key={m.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium">{other?.display_name ?? "Unknown"}</p>
                  <p className="text-xs text-neutral-500">{m.status}</p>
                </div>
                <Link
                  href={`/chat/${m.id}`}
                  className="rounded-full bg-pink-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-pink-400"
                >
                  Open chat
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mb-4 text-lg font-semibold text-neutral-300">
        People to talk to
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {(profiles ?? [])
          .filter((p) => !matchedUserIds.has(p.id))
          .map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-2 rounded-xl border border-neutral-800 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{p.display_name}</p>
                <span
                  className={`h-2 w-2 rounded-full ${
                    p.is_online ? "bg-green-400" : "bg-neutral-600"
                  }`}
                />
              </div>
              <p className="text-sm text-neutral-400 line-clamp-2">
                {p.bio ?? "No bio yet."}
              </p>
              {p.role === "chatter" && p.rate_per_message != null && (
                <p className="text-xs text-neutral-500">
                  ${(p.rate_per_message / 100).toFixed(2)} / message
                </p>
              )}
              <StartMatchButton currentUserId={user.id} otherUserId={p.id} />
            </li>
          ))}
      </ul>
    </div>
  );
}
