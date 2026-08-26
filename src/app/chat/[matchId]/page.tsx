import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatRoom from "@/components/ChatRoom";


export default async function ChatPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: match } = await supabase
    .from("matches")
    .select("id, user_a, user_b, status")
    .eq("id", matchId)
    .maybeSingle();

  if (!match || (match.user_a !== user.id && match.user_b !== user.id)) {
    notFound();
  }

  const otherId = match.user_a === user.id ? match.user_b : match.user_a;

  const { data: otherProfile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, is_online")
    .eq("id", otherId)
    .single();

  const { data: initialMessages } = await supabase
    .from("messages")
    .select("id, match_id, sender_id, body, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true })
    .limit(200);

  return (
    <ChatRoom
      matchId={matchId}
      currentUserId={user.id}
      otherDisplayName={otherProfile?.display_name ?? "Unknown"}
      initialMessages={initialMessages ?? []}
    />
  );
}
