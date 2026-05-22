import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Login,
});

function Login() {
  const [show, setShow] = useState(false);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Animated mesh blobs */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{ backgroundImage: "var(--gradient-mesh)" }}
      />
      <div
        aria-hidden
        className="absolute -top-32 -left-32 -z-10 h-[28rem] w-[28rem] rounded-full opacity-60 blur-3xl animate-[float_14s_ease-in-out_infinite]"
        style={{ background: "oklch(0.85 0.18 75 / 0.6)" }}
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -right-24 -z-10 h-[32rem] w-[32rem] rounded-full opacity-50 blur-3xl animate-[float_18s_ease-in-out_infinite_reverse]"
        style={{ background: "oklch(0.8 0.15 320 / 0.55)" }}
      />

      <style>{`
        @keyframes float {
          0%,100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(40px,-30px) scale(1.08); }
        }
      `}</style>

      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="mb-8 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-foreground text-background">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium tracking-tight">north—</span>
          </div>

          {/* Card */}
          <div
            className="rounded-3xl border border-border/60 bg-card/70 p-8 backdrop-blur-xl"
            style={{ boxShadow: "var(--shadow-soft)" }}
          >
            <h1 className="text-3xl font-semibold tracking-tight">
              Welcome back<span className="text-accent">.</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to pick up where you left off.
            </p>

            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-8 space-y-4"
            >
              <div className="group">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="you@studio.com"
                  className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-foreground/30 focus:bg-background focus:ring-4 focus:ring-accent/30"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>Password</span>
                  <a href="#" className="hover:text-foreground transition-colors">
                    Forgot?
                  </a>
                </label>
                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-border bg-background/60 px-4 py-3 pr-11 text-sm outline-none transition-all placeholder:text-muted-foreground/60 focus:border-foreground/30 focus:bg-background focus:ring-4 focus:ring-accent/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={show ? "Hide password" : "Show password"}
                  >
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="group mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-4 py-3.5 text-sm font-medium text-background transition-all hover:gap-3 hover:bg-foreground/90 active:scale-[0.98]"
              >
                Sign in
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-3 text-xs uppercase tracking-widest text-muted-foreground">
                    or
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-background/60 px-4 py-3 text-sm font-medium transition-all hover:bg-background hover:shadow-sm"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18a11 11 0 0 0 0 9.87l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"/>
                </svg>
                Continue with Google
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New here?{" "}
            <a href="#" className="font-medium text-foreground underline-offset-4 hover:underline">
              Create an account
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
