import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { signIn, signUp, passwordProblem, USERNAME_RE, useSession } from "@/lib/local-store";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — AniTrack" },
      { name: "description", content: "Sign in or create an AniTrack account with just a username and password." },
      { property: "og:title", content: "Sign in — AniTrack" },
      { property: "og:description", content: "Sign in or create an AniTrack account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { userId } = useSession();
  const navigate = useNavigate();

  useEffect(() => { if (userId) navigate({ to: "/list", replace: true }); }, [userId, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "up") {
      if (!USERNAME_RE.test(username)) return setError("Username must be 3–20 letters, numbers or _.");
      const p = passwordProblem(password);
      if (p) return setError(p);
    }
    setBusy(true);
    try {
      if (mode === "up") await signUp(username, password);
      else await signIn(username, password);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-display text-xl font-semibold">
          <Logo className="h-7 w-7" />
          <span>ani<span className="accent-text">track</span></span>
        </Link>
        <div className="rounded-lg border border-border bg-surface p-6">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-md border border-border p-1">
            {(["in", "up"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); }}
                className={`rounded px-3 py-1.5 text-sm ${mode === m ? "bg-foreground text-background" : "text-muted-foreground"}`}
              >
                {m === "in" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>
          <form onSubmit={submit} className="space-y-3">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              autoComplete="username"
              aria-label="Username"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete={mode === "up" ? "new-password" : "current-password"}
              aria-label="Password"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
            />
            {mode === "up" && (
              <p className="text-[11px] text-muted-foreground">
                3–20 letters, numbers or _. Password: 8+ characters with an uppercase, a lowercase and a number.
              </p>
            )}
            {error && <p className="text-xs accent-text">{error}</p>}
            <button
              type="submit"
              disabled={busy || !username || !password}
              className="w-full rounded-md accent-bg px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
