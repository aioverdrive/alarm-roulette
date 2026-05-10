'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function LandingClient() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const goToAlarmsIfSignedIn = (session: { user: unknown } | null) => {
      if (!cancelled && session?.user) router.replace("/alarm");
    };
    supabaseBrowser.auth.getSession().then(({ data: { session } }) => goToAlarmsIfSignedIn(session));
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange((_e, session) => goToAlarmsIfSignedIn(session));
    return () => { cancelled = true; subscription.unsubscribe(); };
  }, [router]);

  const signInWithGoogle = async () => {
    setBusy(true);
    await supabaseBrowser.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/alarm` },
    });
    setBusy(false);
  };

  return (
    <main style={{
      minHeight: '100dvh',
      background: '#010101',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 24px',
    }}>
      {/* Logo / title */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <p style={{ fontSize: '3.5rem', margin: '0 0 8px' }}>🎰</p>
        <h1 style={{
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 700,
          fontSize: '1.6rem',
          color: '#fafafa',
          margin: '0 0 6px',
          lineHeight: 1.2,
        }}>
          Welcome to the
        </h1>
        <h2 style={{
          fontFamily: "'Las Vegas', cursive",
          fontSize: '2.8rem',
          color: '#FCBA04',
          margin: 0,
          lineHeight: 1.1,
        }}>
          Alarm Roulette
        </h2>
        <p style={{
          fontFamily: 'Poppins, sans-serif',
          fontSize: '0.9rem',
          color: 'rgba(255,255,255,0.45)',
          marginTop: '14px',
          lineHeight: 1.5,
        }}>
          Wake up to a mystery ringtone<br />uploaded by your friends.
        </p>
      </div>

      {/* Sign in card */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '16px',
        padding: '32px 24px',
        width: '100%',
        maxWidth: '360px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
      }}>
        <p style={{
          fontFamily: 'Poppins, sans-serif',
          fontWeight: 600,
          fontSize: '1rem',
          color: '#fafafa',
          margin: 0,
        }}>
          Sign in to get started
        </p>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={busy}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            width: '100%',
            background: '#fafafa',
            border: 'none',
            borderRadius: '10px',
            padding: '13px 20px',
            fontFamily: 'Poppins, sans-serif',
            fontWeight: 600,
            fontSize: '0.95rem',
            color: '#010101',
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.7 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          {busy ? 'Redirecting…' : 'Continue with Google'}
        </button>
      </div>
    </main>
  );
}