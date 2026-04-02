"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function LoginForm() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/view";

  useEffect(() => {
    if (status === "authenticated") {
      router.push(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  return (
    <div className="form-card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center', padding: '3rem' }}>
      <div className="section-title" style={{ marginBottom: '2rem' }}>
        <span>Invoice Manager</span>
        <strong>Welcome Back</strong>
      </div>
      <p style={{ color: 'var(--muted)', marginBottom: '2.5rem', fontSize: '0.9rem' }}>
        Please sign in with your Google account to manage your invoices.
      </p>
      <button 
        className="btn btn-primary" 
        onClick={() => signIn("google", { callbackUrl })}
        style={{ width: '100%', gap: '12px' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.48 10.92v3.28h7.84c-.24 1.84-2.21 5.39-7.84 5.39-4.84 0-8.79-4.01-8.79-8.91s3.95-8.91 8.79-8.91c2.75 0 4.6 1.17 5.65 2.18l2.58-2.49c-1.66-1.55-4.23-2.49-8.23-2.49-6.63 0-12 5.37-12 12s5.37 12 12 12c6.93 0 11.53-4.87 11.53-11.72 0-.79-.08-1.39-.18-1.99z"/>
        </svg>
        Sign in with Google
      </button>
    </div>
  );
}
