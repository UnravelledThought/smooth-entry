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
  username: string;
  accent_color: string;
  bio: string | null;
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

export async function signUpWithUsername(username: string, password: string) {
  // Check uniqueness up front for friendlier errors
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();
  if (existing) throw new Error("That username is taken.");

  const { error } = await supabase.auth.signUp({
    email: usernameToEmail(username),
    password,
    options: {
      emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      data: { username },
    },
  });
  if (error) throw error;
}

export async function signInWithUsername(username: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });
  if (error) throw new Error("Wrong username or password.");
}

export async function signOut() {
  await supabase.auth.signOut();
}
