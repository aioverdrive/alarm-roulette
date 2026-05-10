'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import SupabaseAuth from "@/components/SupabaseAuth";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function LandingClient() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const goToAlarmsIfSignedIn = (session: { user: unknown } | null) => {
      if (!cancelled && session?.user) {
        router.replace("/alarms");
      }
    };

    supabaseBrowser.auth.getSession().then(({ data: { session } }) => {
      goToAlarmsIfSignedIn(session);
    });

    const {
      data: { subscription },
    } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      goToAlarmsIfSignedIn(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-3xl space-y-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h1 className="text-4xl font-semibold text-slate-950 dark:text-slate-100">
            Alarm Roulette
          </h1>

          <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
            Sign up with Google to create your account and connect to the Supabase user database.
          </p>
        </section>

        <SupabaseAuth />
      </div>
    </main>
  );
}