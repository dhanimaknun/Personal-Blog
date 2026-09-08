"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export function LoginForm({ from }: { from?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api("/api/auth/login", { method: "POST", json: { username, password } });
      router.replace(from || "/admin");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  const field =
    "w-full rounded-xl border border-divider bg-white px-3.5 py-2.5 text-[15px] text-ink transition-colors placeholder:text-secondary focus:border-accent focus:outline-none";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input
        type="text"
        autoComplete="username"
        placeholder="Username"
        required
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className={field}
      />
      <input
        type="password"
        autoComplete="current-password"
        placeholder="Password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={field}
      />
      {error ? <p className="text-[13px] text-[#c8102e]">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-xl bg-accent py-2.5 text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
