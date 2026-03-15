"use client";

import { useState, FormEvent } from "react";
import { loginWithAuthCode, requestMagicLink } from "../../../actions/auth";

export default function LoginPage() {
  const [authCode, setAuthCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [magicLinkError, setMagicLinkError] = useState("");
  const [magicLinkSuccess, setMagicLinkSuccess] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);

  async function handleAuthCodeSubmit(e: FormEvent) {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const result = await loginWithAuthCode(authCode.trim());
      if (result.success) {
        window.location.href = `/draft/${result.sessionId}?playerId=${result.playerId}`;
      } else {
        setAuthError(result.error);
      }
    } catch {
      setAuthError("Something went wrong. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleMagicLinkSubmit(e: FormEvent) {
    e.preventDefault();
    setMagicLinkError("");
    setMagicLinkSuccess(false);
    setMagicLinkLoading(true);

    try {
      const result = await requestMagicLink(email.trim());
      if (result.success) {
        setMagicLinkSuccess(true);
      } else {
        setMagicLinkError(result.error || "Failed to send magic link.");
      }
    } catch {
      setMagicLinkError("Something went wrong. Please try again.");
    } finally {
      setMagicLinkLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-foreground text-center mb-8">
          Wrestling Draft
        </h1>

        <div className="bg-muted border border-border rounded-lg p-6 space-y-8">
          {/* Auth Code Login */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
              Enter your code
            </h2>
            <form onSubmit={handleAuthCodeSubmit} className="space-y-3">
              <input
                type="text"
                value={authCode}
                onChange={(e) => setAuthCode(e.target.value.toUpperCase())}
                placeholder="6-character code"
                maxLength={6}
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground placeholder:text-muted-foreground text-center text-lg tracking-widest font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                autoComplete="off"
                autoFocus
              />
              <button
                type="submit"
                disabled={authLoading || authCode.trim().length === 0}
                className="w-full px-3 py-2 bg-accent text-accent-foreground rounded text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {authLoading ? "Signing in…" : "Sign in"}
              </button>
              {authError && (
                <p className="text-sm text-destructive">{authError}</p>
              )}
            </form>
          </section>

          <div className="border-t border-border" />

          {/* Magic Link Login */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
              Or sign in with email
            </h2>
            <form onSubmit={handleMagicLinkSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                autoComplete="email"
              />
              <button
                type="submit"
                disabled={magicLinkLoading || email.trim().length === 0}
                className="w-full px-3 py-2 bg-accent text-accent-foreground rounded text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {magicLinkLoading ? "Sending…" : "Send magic link"}
              </button>
              {magicLinkError && (
                <p className="text-sm text-destructive">{magicLinkError}</p>
              )}
              {magicLinkSuccess && (
                <p className="text-sm text-success">
                  Check your email for a login link.
                </p>
              )}
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
