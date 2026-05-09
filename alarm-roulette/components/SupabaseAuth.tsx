"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function SupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState("Checking authentication...");

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const {
        data: { session },
      } = await supabaseBrowser.auth.getSession();

      if (!isMounted) return;
      setUser(session?.user ?? null);
      setStatus(session ? "You are signed in." : "You are not signed in.");
    }

    loadSession();

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      setStatus(session ? "You are signed in." : "You are not signed in.");
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    setStatus("Redirecting to Google sign-in...");
    const { error } = await supabaseBrowser.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setStatus(`Sign-in failed: ${error.message}`);
    }
  };

  const signOut = async () => {
    const { error } = await supabaseBrowser.auth.signOut();
    if (error) {
      setStatus(`Sign-out failed: ${error.message}`);
    } else {
      setUser(null);
      setStatus("Signed out.");
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold text-slate-950 dark:text-slate-100">Sign up with Google</h1>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          Click below to sign in with Google using Supabase Auth. Your account will be created automatically.
        </p>
      </div>

      {user ? (
        <div className="rounded-2xl bg-slate-100 p-6 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
          <p className="text-sm font-medium">Signed in as:</p>
          <pre className="mt-3 overflow-x-auto text-xs text-slate-700 dark:text-slate-200">
            {JSON.stringify({ id: user.id, email: user.email, metadata: user.user_metadata }, null, 2)}
          </pre>
          <button
            type="button"
            onClick={signOut}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={signInWithGoogle}
            className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Continue with Google
          </button>
          <p className="text-sm text-slate-600 dark:text-slate-300">You only need to sign in once to create your account.</p>
        </div>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400">
        If the button does not work, make sure your Supabase Google provider is enabled and your environment variables are set.
      </p>
    </section>
  );
}
