import { useEffect, useMemo, useState } from "react";

import { getSupabaseClient, isSupabaseConfigured, supabase } from "../lib/supabase";
import { fetchCurrentUser } from "../services/api";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [auraUser, setAuraUser] = useState(null);
  const [auraUserError, setAuraUserError] = useState("");
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
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setLoading(false);

      if (event === "SIGNED_OUT" || !nextSession) {
        setAuraUser(null);
        setAuraUserError("");
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.access_token) {
      return undefined;
    }

    let active = true;

    fetchCurrentUser()
      .then((currentUser) => {
        if (active) {
          setAuraUser(currentUser);
          setAuraUserError("");
        }
      })
      .catch((error) => {
        if (active) {
          setAuraUser(null);
          setAuraUserError(error.message || "Failed to sync AURA user.");
        }
      });

    return () => {
      active = false;
    };
  }, [session?.access_token, session?.user?.id]);

  const auraUserLoading = Boolean(session?.access_token) && !auraUser && !auraUserError;

  const value = useMemo(
    () => ({
      accessToken: session?.access_token ?? null,
      auraRole: auraUser?.role ?? null,
      auraUser,
      auraUserError,
      auraUserLoading,
      isAuthenticated: Boolean(session?.user),
      isSupabaseConfigured,
      loading,
      session,
      signInWithEmail: async (email, redirectTo = window.location.origin) => {
        const client = getSupabaseClient();
        const { error } = await client.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo,
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
    [auraUser, auraUserError, auraUserLoading, loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
