import { useEffect, useMemo, useState } from "react";

import { getSupabaseClient, isSupabaseConfigured, supabase } from "../lib/supabase";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    let active = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load Supabase session.", error);
          return;
        }
        if (active) {
          setSession(data.session ?? null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      accessToken: session?.access_token ?? null,
      isAuthenticated: Boolean(session?.user),
      isSupabaseConfigured,
      loading,
      session,
      signInWithEmail: async (email) => {
        const client = getSupabaseClient();
        const { error } = await client.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: window.location.href,
          },
        });
        if (error) {
          throw error;
        }
      },
      signOut: async () => {
        if (!supabase) {
          return;
        }
        const { error } = await supabase.auth.signOut();
        if (error) {
          throw error;
        }
      },
      user: session?.user ?? null,
    }),
    [loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
