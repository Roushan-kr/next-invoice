"use client";

import { useEffect } from "react";
import Header from "@/components/Header";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global Error Boundary caught an exception:", error);
  }, [error]);

  return (
    <>
      <Header />
      <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', textAlign: 'center' }}>
        <div className="section-title" style={{ marginBottom: '1.5rem' }}>
          <span>System Error</span>
          <strong>Oops! Something went wrong</strong>
        </div>
        <p style={{ color: 'var(--muted)', marginBottom: '2.5rem', maxWidth: '500px', lineHeight: '1.6' }}>
          We encountered an unexpected error while processing your request. This could be due to a lost connection or a momentary database issue.
        </p>
        <div className="btn-row">
          <button
            className="btn btn-primary"
            onClick={() => reset()}
          >
            🔄 Try Again
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => window.location.href = "/"}
          >
            🏠 Go Home
          </button>
        </div>
      </div>
    </>
  );
}
