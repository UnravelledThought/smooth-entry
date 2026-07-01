import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Logo } from "@/components/brand/Logo";
import {
  signInWithUsername, signUpWithUsername,
  validatePassword, validateUsername, useAuth,
} from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  component: AuthRoute,
});

function AuthRoute() {
  return <Layout><AuthPage /></Layout>;
}

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => { if (user) navigate({ to: "/" }); }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const uErr = validateUsername(username);
    if (uErr) return setError(uErr);
    if (mode === "signup") {
      const pErr = validatePassword(password);
      if (pErr) return setError(pErr);
    }
    setBusy(true);
    try {
      if (mode === "signup") await signUpWithUsername(username, password);
      else await signInWithUsername(username, password);
      navigate({ to: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-5 py-12">
      <div className="mb-8"><Logo variant="lockup" size="lg" /></div>
      <h1 className="font-display text-4xl font-bold">
        {mode === "signin" ? "Welcome back" : "Make an account"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "signin" ? "Sign in to access your list." : "Just a username and a password. No email."}
      </p>
      <form onSubmit={submit} className="mt-8 space-y-3">
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-foreground"
            placeholder="otaku_fan"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wider text-muted-foreground">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-foreground"
            placeholder={mode === "signup" ? "8+ chars, 1 upper, 1 lower, 1 number" : ""}
          />
        </div>
        {error && <p className="text-sm" style={{ color: "var(--accent-color)" }}>{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="accent-bg w-full rounded-lg px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>
      <button
        onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
        className="mt-6 text-center text-sm text-muted-foreground hover:text-foreground"
      >
        {mode === "signin" ? "No account yet? Sign up" : "Already have an account? Sign in"}
      </button>
      <Link to="/" className="mt-2 text-center text-xs text-muted-foreground hover:text-foreground">
        ← Back to discover
      </Link>
    </div>
  );
}
