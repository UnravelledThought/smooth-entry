import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
export const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[a-z]/.test(pw)) return "Password needs a lowercase letter.";
  if (!/[A-Z]/.test(pw)) return "Password needs an uppercase letter.";
  if (!/\d/.test(pw)) return "Password needs a number.";
  return null;
}

export function validateUsername(u: string): string | null {
  if (!USERNAME_RE.test(u)) return "3–20 chars, letters/numbers/underscore only.";
  return null;
}

const usernameToEmail = (username: string) => `${username.toLowerCase()}@otaku.local`;

export type Profile = {
  id: string;
  uid: number;
  username: string;
  accent_color: string;
  bio: string | null;
  avatar_url: string | null;
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null, session: null, profile: null, loading: true, refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile(data as Profile | null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadProfile(data.session.user.id).then(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  return (
    <Ctx.Provider value={{ user: session?.user ?? null, session, profile, loading, refreshProfile }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}

// Client-side guessing brake. Not a server rate limit — it just makes casual
// password guessing through the UI slow, since there is no email recovery path
// and the password is the only credential.
const FREE_ATTEMPTS = 5;
const attempts = new Map<string, { count: number; blockedUntil: number }>();

function cooldownMs(count: number) {
  return Math.min(2 ** (count - FREE_ATTEMPTS) * 1000, 60_000);
}

function assertNotThrottled(key: string) {
  const rec = attempts.get(key);
  if (!rec) return;
  const wait = rec.blockedUntil - Date.now();
  if (wait > 0) {
    throw new Error(`Too many attempts. Try again in ${Math.ceil(wait / 1000)}s.`);
  }
}

function recordFailure(key: string) {
  const rec = attempts.get(key) ?? { count: 0, blockedUntil: 0 };
  rec.count += 1;
  if (rec.count > FREE_ATTEMPTS) rec.blockedUntil = Date.now() + cooldownMs(rec.count);
  attempts.set(key, rec);
}

export async function signUpWithUsername(username: string, password: string) {
  // Check uniqueness up front for friendlier errors
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();
  if (existing) throw new Error("That username is taken.");

  // No email is ever sent or collected — the address is a synthetic internal id.
  const { error } = await supabase.auth.signUp({
    email: usernameToEmail(username),
    password,
    options: { data: { username } },
  });
  if (error) throw error;
}

export async function signInWithUsername(username: string, password: string) {
  const key = username.toLowerCase();
  assertNotThrottled(key);
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });
  if (error) {
    recordFailure(key);
    throw new Error("Wrong username or password.");
  }
  attempts.delete(key);
}

export async function signOut() {
  await supabase.auth.signOut();
}
