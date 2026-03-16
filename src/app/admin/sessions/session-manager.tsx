"use client";

import { useState, useTransition } from "react";
import {
  createSession,
  startSession,
  setDraftOrder,
  updatePlayerName,
  updatePlayerEmail,
  addPlayerToSession,
  deleteSession,
  removePlayer,
} from "../../../../actions/session";
import { JoinQRCode } from "../../../components/JoinQRCode";

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

export function CreateSessionForm({
  organizerEmail,
}: {
  organizerEmail: string;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await createSession(name, organizerEmail);
      if (!result.success) {
        setError(result.error);
      } else {
        setName("");
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
  sessionId,
  draftOrderValue,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  player: Player;
  isSetup: boolean;
  sessionId: string;
  draftOrderValue: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
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

  function handleRemove() {
    startSaving(async () => {
      await removePlayer(sessionId, player.id);
      window.location.reload();
    });
  }

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="py-2 px-3">
        {isSetup ? (
          <div className="flex items-center gap-1">
            <span className="text-sm text-foreground w-6 text-center">
              {draftOrderValue}
            </span>
            <div className="flex flex-col">
              <button
                onClick={onMoveUp}
                disabled={isFirst || isSaving}
                className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none"
                aria-label="Move up"
              >
                ▲
              </button>
              <button
                onClick={onMoveDown}
                disabled={isLast || isSaving}
                className="text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none"
                aria-label="Move down"
              >
                ▼
              </button>
            </div>
          </div>
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
      {isSetup && (
        <td className="py-2 px-3">
          <button
            onClick={handleRemove}
            disabled={isSaving}
            className="text-xs text-destructive hover:underline disabled:opacity-50"
          >
            Remove
          </button>
        </td>
      )}
    </tr>
  );
}

function AddPlayerForm({ sessionId }: { sessionId: string }) {
  const [teamName, setTeamName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await addPlayerToSession(
        sessionId,
        teamName,
        email || undefined,
      );
      if (!result.success) {
        setError(result.error);
      } else {
        setTeamName("");
        setEmail("");
        window.location.reload();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Team name"
          required
          className="flex-1 px-2 py-1.5 border border-border rounded text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email (optional)"
          className="flex-1 px-2 py-1.5 border border-border rounded text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={isPending}
          className="px-3 py-1.5 border border-border rounded-md text-sm text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
        >
          {isPending ? "Adding..." : "Add Player"}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}

function CopyJoinLink({ sessionId }: { sessionId: string }) {
  const [copied, setCopied] = useState(false);
  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${sessionId}`
      : `/join/${sessionId}`;

  function handleCopy() {
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        readOnly
        value={joinUrl}
        className="flex-1 px-2 py-1 border border-border rounded text-xs bg-background text-foreground font-mono focus:outline-none"
      />
      <button
        onClick={handleCopy}
        className="px-2 py-1 border border-border rounded text-xs text-foreground hover:bg-muted transition-colors"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function SessionCard({
  session,
  sessionPlayers,
  organizerEmail,
}: {
  session: Session;
  sessionPlayers: Player[];
  organizerEmail: string;
}) {
  const isSetup = session.status === "setup";
  const [draftOrders, setDraftOrders] = useState<Record<string, number>>(
    Object.fromEntries(sessionPlayers.map((p) => [p.id, p.draftOrder])),
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  function handleDelete() {
    setError("");
    startTransition(async () => {
      const result = await deleteSession(session.id, organizerEmail);
      if (!result.success) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    });
  }

  const sortedPlayers = [...sessionPlayers].sort(
    (a, b) =>
      (draftOrders[a.id] ?? a.draftOrder) - (draftOrders[b.id] ?? b.draftOrder),
  );

  function handleMoveUp(playerId: string) {
    const currentOrder = draftOrders[playerId];
    if (currentOrder <= 1) return;
    // Find the player currently at currentOrder - 1
    const swapEntry = Object.entries(draftOrders).find(
      ([, order]) => order === currentOrder - 1,
    );
    if (!swapEntry) return;
    setDraftOrders((prev) => ({
      ...prev,
      [playerId]: currentOrder - 1,
      [swapEntry[0]]: currentOrder,
    }));
  }

  function handleMoveDown(playerId: string) {
    const currentOrder = draftOrders[playerId];
    if (currentOrder >= sessionPlayers.length) return;
    const swapEntry = Object.entries(draftOrders).find(
      ([, order]) => order === currentOrder + 1,
    );
    if (!swapEntry) return;
    setDraftOrders((prev) => ({
      ...prev,
      [playerId]: currentOrder + 1,
      [swapEntry[0]]: currentOrder,
    }));
  }

  return (
    <div className="border border-border rounded-lg bg-background">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h3 className="text-base font-medium text-foreground">
            {session.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {sessionPlayers.length} players joined · Created{" "}
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
                Team Name
              </th>
              <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-3">
                Email
              </th>
              {isSetup && (
                <th className="text-left text-xs font-medium text-muted-foreground py-1.5 px-3 w-20"></th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedPlayers.map((player, idx) => (
              <PlayerRow
                key={player.id}
                player={player}
                isSetup={isSetup}
                sessionId={session.id}
                draftOrderValue={draftOrders[player.id] ?? player.draftOrder}
                onMoveUp={() => handleMoveUp(player.id)}
                onMoveDown={() => handleMoveDown(player.id)}
                isFirst={idx === 0}
                isLast={idx === sortedPlayers.length - 1}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Player */}
      {isSetup && (
        <div className="px-4 pb-4">
          <p className="text-xs text-muted-foreground mb-2">
            Add a player manually:
          </p>
          <AddPlayerForm sessionId={session.id} />
        </div>
      )}

      {/* Join Link & QR Code */}
      {isSetup && (
        <div className="p-4 border-t border-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <JoinQRCode sessionId={session.id} size={140} />
            <div className="flex-1 space-y-2">
              <p className="text-sm text-muted-foreground">
                Share this link or QR code so players can join:
              </p>
              <CopyJoinLink sessionId={session.id} />
            </div>
          </div>
        </div>
      )}

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
          <div className="flex gap-2">
            <a
              href={`/draft/${session.id}/admin`}
              className="inline-block px-3 py-1.5 bg-accent text-accent-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Go to Draft Admin
            </a>
            <a
              href={`/draft/${session.id}/display`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-3 py-1.5 border border-border rounded-md text-sm text-foreground hover:bg-muted transition-colors"
            >
              Display View ↗
            </a>
          </div>
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
              href={`/draft/${session.id}/display`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-3 py-1.5 border border-border rounded-md text-sm text-foreground hover:bg-muted transition-colors"
            >
              Display View ↗
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

        {/* Delete */}
        <div className="mt-3 pt-3 border-t border-border">
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-destructive hover:underline"
            >
              Delete Draft
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-destructive">
                This will permanently delete this draft and all its data.
              </span>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-2 py-1 bg-destructive text-destructive-foreground rounded text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {isPending ? "Deleting..." : "Confirm"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 border border-border rounded text-xs text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
