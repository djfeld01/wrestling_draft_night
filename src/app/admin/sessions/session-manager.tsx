"use client";

import { useState, useTransition } from "react";
import {
  createSession,
  startSession,
  setDraftOrder,
  updatePlayerName,
  updatePlayerEmail,
} from "../../../../actions/session";

type Session = {
  id: string;
  name: string;
  status: "setup" | "active" | "completed";
  playerCount: number;
  currentRound: number;
  currentPickNumber: number;
  createdAt: Date;
};

type Player = {
  id: string;
  sessionId: string;
  name: string;
  email: string | null;
  authCode: string;
  draftOrder: number;
};

export function CreateSessionForm() {
  const [name, setName] = useState("");
  const [playerCount, setPlayerCount] = useState(10);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createSession(name, playerCount);
      if (!result.success) {
        setError(result.error);
      } else {
        setName("");
        setPlayerCount(10);
        window.location.reload();
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-border rounded-lg p-5 bg-muted"
    >
      <h2 className="text-lg font-medium text-foreground mb-4">
        Create Session
      </h2>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor="session-name"
            className="block text-sm text-muted-foreground mb-1"
          >
            Session Name
          </label>
          <input
            id="session-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 2026 NCAA Draft"
            required
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="w-32">
          <label
            htmlFor="player-count"
            className="block text-sm text-muted-foreground mb-1"
          >
            Players
          </label>
          <input
            id="player-count"
            type="number"
            min={2}
            max={16}
            value={playerCount}
            onChange={(e) => setPlayerCount(Number(e.target.value))}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isPending ? "Creating..." : "Create"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </form>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    setup: "bg-muted text-muted-foreground",
    active: "bg-success/10 text-success",
    completed: "bg-accent/10 text-accent",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${styles[status] || styles.setup}`}
    >
      {status}
    </span>
  );
}

function PlayerRow({
  player,
  isSetup,
  draftOrderValue,
  onDraftOrderChange,
}: {
  player: Player;
  isSetup: boolean;
  draftOrderValue: number;
  onDraftOrderChange: (val: number) => void;
}) {
  const [playerName, setPlayerName] = useState(player.name);
  const [playerEmail, setPlayerEmail] = useState(player.email || "");
  const [isSaving, startSaving] = useTransition();

  function handleNameBlur() {
    if (playerName.trim() !== player.name) {
      startSaving(async () => {
        await updatePlayerName(player.id, playerName);
      });
    }
  }

  function handleEmailBlur() {
    if (playerEmail.trim().toLowerCase() !== (player.email || "")) {
      startSaving(async () => {
        await updatePlayerEmail(player.id, playerEmail);
      });
    }
  }

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="py-2 px-3">
        {isSetup ? (
          <input
            type="number"
            min={1}
            value={draftOrderValue}
            onChange={(e) => onDraftOrderChange(Number(e.target.value))}
            className="w-14 px-2 py-1 border border-border rounded text-sm bg-background text-foreground text-center focus:outline-none focus:ring-1 focus:ring-accent"
          />
        ) : (
          <span className="text-sm text-muted-foreground">
            {player.draftOrder}
          </span>
        )}
      </td>
      <td className="py-2 px-3">
        {isSetup ? (
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onBlur={handleNameBlur}
            disabled={isSaving}
            className="w-full px-2 py-1 border border-border rounded text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
          />
        ) : (
          <span className="text-sm text-foreground">{player.name}</span>
        )}
      </td>
      <td className="py-2 px-3">
        {isSetup ? (
          <input
            type="email"
            value={playerEmail}
            onChange={(e) => setPlayerEmail(e.target.value)}
            onBlur={handleEmailBlur}
            disabled={isSaving}
            placeholder="email@example.com"
            className="w-full px-2 py-1 border border-border rounded text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
          />
        ) : (
          <span className="text-sm text-muted-foreground">
            {player.email || "—"}
          </span>
        )}
      </td>
    </tr>
  );
}

export function SessionCard({
  session,
  sessionPlayers,
}: {
  session: Session;
  sessionPlayers: Player[];
}) {
  const isSetup = session.status === "setup";
  const [draftOrders, setDraftOrders] = useState<Record<string, number>>(
    Object.fromEntries(sessionPlayers.map((p) => [p.id, p.draftOrder])),
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleDraftOrderChange(playerId: string, val: number) {
    setDraftOrders((prev) => ({ ...prev, [playerId]: val }));
  }

  function handleSaveOrder() {
    setError("");
    startTransition(async () => {
      const order = Object.entries(draftOrders).map(
        ([playerId, draftOrder]) => ({
          playerId,
          draftOrder,
        }),
      );
      const result = await setDraftOrder(session.id, order);
      if (!result.success) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    });
  }

  function handleStartDraft() {
    setError("");
    startTransition(async () => {
      const result = await startSession(session.id);
      if (!result.success) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    });
  }

  const sortedPlayers = [...sessionPlayers].sort(
    (a, b) => a.draftOrder - b.draftOrder,
  );

  return (
    <div className="border border-border rounded-lg bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="text-base font-medium text-foreground">
            {session.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {session.playerCount} players · Created{" "}
            {session.createdAt.toLocaleDateString()}
          </p>
        </div>
        <StatusBadge status={session.status} />
      </div>

      {/* Players table */}
      <div className="p-4">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-3 w-20">
                Order
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-3">
                Name
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-3">
                Email
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player) => (
              <PlayerRow
                key={player.id}
                player={player}
                isSetup={isSetup}
                draftOrderValue={draftOrders[player.id] ?? player.draftOrder}
                onDraftOrderChange={(val) =>
                  handleDraftOrderChange(player.id, val)
                }
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border">
        {error && <p className="text-sm text-destructive mb-3">{error}</p>}

        {isSetup && (
          <div className="flex gap-2">
            <button
              onClick={handleSaveOrder}
              disabled={isPending}
              className="px-3 py-1.5 border border-border rounded-md text-sm text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
            >
              {isPending ? "Saving..." : "Save Order"}
            </button>
            <button
              onClick={handleStartDraft}
              disabled={isPending}
              className="px-3 py-1.5 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isPending ? "Starting..." : "Start Draft"}
            </button>
          </div>
        )}

        {session.status === "active" && (
          <a
            href={`/draft/${session.id}/admin`}
            className="inline-block px-3 py-1.5 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Go to Draft Admin
          </a>
        )}

        {session.status === "completed" && (
          <div className="flex gap-2">
            <a
              href={`/draft/${session.id}/admin`}
              className="inline-block px-3 py-1.5 border border-border rounded-md text-sm text-foreground hover:bg-muted transition-colors"
            >
              View Draft
            </a>
            <a
              href={`/api/draft/${session.id}/export?format=csv`}
              download
              className="inline-block px-3 py-1.5 border border-border rounded-md text-sm text-foreground hover:bg-muted transition-colors"
            >
              Export CSV
            </a>
            <a
              href={`/api/draft/${session.id}/export?format=xlsx`}
              download
              className="inline-block px-3 py-1.5 border border-border rounded-md text-sm text-foreground hover:bg-muted transition-colors"
            >
              Export XLSX
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
