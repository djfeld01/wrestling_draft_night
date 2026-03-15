"use client";

import { useState, FormEvent } from "react";
import { requestMagicLink } from "../../../actions/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const result = await requestMagicLink(email.trim());
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || "Failed to send login link.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-foreground text-center mb-8">
          Wrestling Draft
        </h1>

        <div className="bg-muted border border-border rounded-lg p-6">
          {success ? (
            <div className="text-center space-y-3">
              <p className="text-foreground">
                Check your email for a login link.
              </p>
              <p className="text-sm text-muted-foreground">
                It may take a moment to arrive. Check your spam folder if you
                don't see it.
              </p>
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                }}
                className="text-sm text-accent hover:underline"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Sign in with email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-2 w-full px-3 py-2 bg-background border border-border rounded text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                  autoComplete="email"
                  autoFocus
                  required
                />
              </label>
              <button
                type="submit"
                disabled={loading || email.trim().length === 0}
                className="w-full px-3 py-2 bg-accent text-accent-foreground rounded text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending…" : "Send login link"}
              </button>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
