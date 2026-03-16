"use client";

import { useState, FormEvent } from "react";
import { joinSession } from "../../../../actions/auth";
import { joinTeam } from "../../../../actions/team";

export default function JoinSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<"create" | "join">("create");
  const [email, setEmail] = useState("");
  const [teamName, setTeamName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Resolve params
  if (!sessionId) {
    params.then((p) => setSessionId(p.sessionId));
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  async function handleCreateTeam(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const result = await joinSession(
        sessionId!,
        email.trim(),
        teamName.trim(),
      );
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || "Failed to join session.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinTeam(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const result = await joinTeam(
        sessionId!,
        email.trim(),
        ownerEmail.trim(),
      );
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || "Failed to join team.");
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
        <h1 className="text-2xl font-semibold text-foreground text-center mb-2">
          Wrestling Draft
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Join the draft session
        </p>

        <div className="bg-muted border border-border rounded-lg p-6">
          {success ? (
            <div className="text-center space-y-3">
              <p className="text-foreground">
                Check your email for a login link.
              </p>
              <p className="text-sm text-muted-foreground">
                It may take a moment to arrive. Check your spam folder if you
                don&apos;t see it.
              </p>
              <button
                onClick={() => {
                  setSuccess(false);
                  setEmail("");
                  setTeamName("");
                  setOwnerEmail("");
                }}
                className="text-sm text-accent hover:underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {/* Mode toggle */}
              <div className="flex gap-2 mb-5">
                <button
                  onClick={() => {
                    setMode("create");
                    setError("");
                  }}
                  className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                    mode === "create"
                      ? "bg-accent text-accent-foreground"
                      : "bg-background text-muted-foreground border border-border hover:bg-muted"
                  }`}
                >
                  Create a Team
                </button>
                <button
                  onClick={() => {
                    setMode("join");
                    setError("");
                  }}
                  className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${
                    mode === "join"
                      ? "bg-accent text-accent-foreground"
                      : "bg-background text-muted-foreground border border-border hover:bg-muted"
                  }`}
                >
                  Join a Team
                </button>
              </div>

              {mode === "create" ? (
                <form onSubmit={handleCreateTeam} className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-muted-foreground">
                      Email
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mt-1 w-full px-3 py-2 bg-background border border-border rounded text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                      autoComplete="email"
                      autoFocus
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-muted-foreground">
                      Team Name
                    </span>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g. The Takedown Artists"
                      className="mt-1 w-full px-3 py-2 bg-background border border-border rounded text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                      autoComplete="off"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={loading || email.trim().length === 0}
                    className="w-full px-3 py-2 bg-accent text-accent-foreground rounded text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Joining..." : "Join & Send Login Link"}
                  </button>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </form>
              ) : (
                <form onSubmit={handleJoinTeam} className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-muted-foreground">
                      Your Email
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="mt-1 w-full px-3 py-2 bg-background border border-border rounded text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                      autoComplete="email"
                      autoFocus
                      required
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-muted-foreground">
                      Team Owner&apos;s Email
                    </span>
                    <input
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="teammate@example.com"
                      className="mt-1 w-full px-3 py-2 bg-background border border-border rounded text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                      autoComplete="off"
                      required
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Enter the email of the person who created the team you want
                    to join. You&apos;ll share their picks and be able to make
                    picks on their behalf.
                  </p>
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      email.trim().length === 0 ||
                      ownerEmail.trim().length === 0
                    }
                    className="w-full px-3 py-2 bg-accent text-accent-foreground rounded text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Joining..." : "Join Team & Send Login Link"}
                  </button>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
