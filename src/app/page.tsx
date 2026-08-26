import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Real conversations, <span className="text-pink-400">real fast</span>.
      </h1>
      <p className="max-w-xl text-neutral-400">
        vibeyminds connects people who want a friendly ear or a flirty chat
        with real conversationalists, in real time.
      </p>
      <div className="flex gap-4">
        <Link
          href="/signup"
          className="rounded-full bg-pink-500 px-6 py-2.5 font-medium text-white hover:bg-pink-400"
        >
          Create an account
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-neutral-700 px-6 py-2.5 font-medium text-neutral-200 hover:border-neutral-500"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
