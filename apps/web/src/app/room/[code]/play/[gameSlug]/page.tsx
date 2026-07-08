"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { ArrowLeft, Eye, EyeOff, Flag, Play, RotateCcw, Vote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AppScreen, ErrorState, GameStatus, LoadingState, VoteCard } from "@/components/ui/GameUI";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { serverUrl } from "@/lib/config";
import { clearRoomSession, getStoredSession } from "@/lib/session";

type Player = { id: string; name: string; avatarId?: number; isHost?: boolean };
type GameState = {
  type: "imposter";
  playMode: "multiplayer" | "single_device";
  phase: "role_reveal" | "discussion" | "voting" | "results";
  players: Player[];
  wordCategory: string;
  roundTimerSeconds: number;
  startedAt: string;
  endsAt: string;
  readyPlayerIds: string[];
  votes: Record<string, string>;
  round: number;
};
type Room = {
  code: string;
  name?: string;
  players: Player[];
  status: "waiting" | "in_game" | "ended";
  selectedGame?: { slug: string; name: string };
  gameState?: GameState;
};
type PersonalState = GameState & {
  role: "player" | "imposter";
  word: string | null;
  imposterPlayerIds: string[] | null;
  imposterPlayerNames: string[] | null;
};

export default function PlayGamePage({ params }: { params: Promise<{ code: string; gameSlug: string }> }) {
  const router = useRouter();
  const { code, gameSlug } = use(params);
  const roomCode = code.toUpperCase();
  const [room, setRoom] = useState<Room | null>(null);
  const [personal, setPersonal] = useState<PersonalState | null>(null);
  const [currentPlayerId] = useState(() => getStoredSession().roomCode?.toUpperCase() === roomCode ? getStoredSession().playerId : null);
  const [roleVisible, setRoleVisible] = useState(false);
  const [selectedVote, setSelectedVote] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState("");
  const [ended, setEnded] = useState(false);

  const gameState = room?.gameState;
  const currentPlayer = room?.players.find((player) => player.id === currentPlayerId);
  const isHost = Boolean(currentPlayer?.isHost);
  const hasVoted = Boolean(currentPlayerId && gameState?.votes[currentPlayerId]);
  const readyCount = gameState?.readyPlayerIds.length ?? 0;
  const playerCount = gameState?.players.length ?? 0;
  const voteCount = gameState ? Object.keys(gameState.votes).length : 0;
  const allReady = playerCount > 0 && readyCount === playerCount;
  const allVoted = playerCount > 0 && voteCount === playerCount;

  const voteTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.values(gameState?.votes ?? {}).forEach((target) => { totals[target] = (totals[target] ?? 0) + 1; });
    return totals;
  }, [gameState?.votes]);

  useEffect(() => {
    if (!currentPlayerId) router.replace(`/room/${roomCode}`);
  }, [currentPlayerId, roomCode, router]);

  useEffect(() => {
    const socket = io(serverUrl);
    socket.emit("room:subscribe", { roomCode });
    socket.on("room:state", (nextRoom: Room) => {
      setRoom(nextRoom);
      setError("");
    });
    socket.on("game:ended", () => setEnded(true));
    socket.on("room:ended", () => {
      clearRoomSession();
      router.push("/");
    });
    socket.on("room:error", (payload: { message: string }) => setError(payload.message));
    return () => {
      socket.disconnect();
    };
  }, [roomCode, router]);

  useEffect(() => {
    if (!currentPlayerId || !gameState || gameSlug !== "imposter") return;
    fetch(`${serverUrl}/rooms/${roomCode}/game-state/${currentPlayerId}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        setPersonal(data);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load your role."));
  }, [currentPlayerId, gameSlug, gameState, roomCode]);

  useEffect(() => {
    if (!gameState?.endsAt || gameState.phase !== "discussion") return;
    const update = () => setTimeLeft(Math.max(0, Math.ceil((new Date(gameState.endsAt).getTime() - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [gameState?.endsAt, gameState?.phase]);

  async function post(action: string, body: Record<string, unknown> = {}) {
    if (!currentPlayerId) return;
    setError("");
    const response = await fetch(`${serverUrl}/rooms/${roomCode}/games/imposter/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerId: currentPlayerId, ...body })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    if (data.room) setRoom(data.room);
    return data;
  }

  async function perform(action: string, body?: Record<string, unknown>) {
    try {
      await post(action, body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That action failed.");
    }
  }

  async function endGame() {
    if (!currentPlayerId) return;
    try {
      const response = await fetch(`${serverUrl}/rooms/${roomCode}/games/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: currentPlayerId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setEnded(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not end game.");
    }
  }

  if (ended) {
    return (
      <AppScreen tone="blue" className="grid place-items-center">
        <section className="w-full max-w-[25rem] text-center">
          <Flag className="mx-auto" size={48} />
          <h1 className="mt-5 text-title-lg-bold">Game Ended</h1>
          <p className="mt-3 text-body-medium opacity-70">Everyone returns to the same room to choose what to play next.</p>
          <Button onClick={() => router.push(`/room/${roomCode}`)} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<ArrowLeft />} className="mt-8 w-full">Back to Same Room</Button>
        </section>
      </AppScreen>
    );
  }
  if (error && !room) {
    return <ErrorState title="Game unavailable" message={error} action={<Button onClick={() => router.push(`/room/${roomCode}`)} variant="inverted" size="lg" className="w-full">Back to Room</Button>} />;
  }
  if (!room || !gameState || !personal) return <LoadingState title="Joining Game..." subtitle={`as ${currentPlayer?.name ?? "player"}`} />;

  const formattedTime = `${Math.floor(timeLeft / 60)}m ${String(timeLeft % 60).padStart(2, "0")}s`;
  const ready = Boolean(currentPlayerId && gameState.readyPlayerIds.includes(currentPlayerId));
  const firstPlayer = gameState.players[gameState.round % gameState.players.length]?.name ?? gameState.players[0]?.name;

  return (
    <AppScreen tone={gameState.phase === "role_reveal" ? "dark" : "light"}>
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[42rem] flex-col">
        <div className="flex items-start justify-between gap-4">
          <BrandNav title={gameState.phase === "voting" ? "Cast your Vote" : gameState.phase === "results" ? "Results" : undefined} tone={gameState.phase === "role_reveal" ? "dark" : "light"} />
          {isHost && (
            <div className="flex gap-2">
              <Button onClick={() => router.push(`/room/${roomCode}`)} variant={gameState.phase === "role_reveal" ? "inverted" : "primary"} size="md" showLeftIcon={false} showRightIcon={false}>Go to Room</Button>
              <Button onClick={endGame} variant="secondary" size="md" showLeftIcon={false} showRightIcon={false}>End Game</Button>
            </div>
          )}
        </div>

        {error && <p role="alert" className="mt-5 rounded-[var(--radius-md)] bg-[var(--danger)] px-4 py-3 text-footnote-semibold text-white">{error}</p>}

        {gameState.phase === "role_reveal" && (
          <section className="flex flex-1 flex-col items-center justify-center py-8 text-center">
            {!roleVisible ? (
              <>
                <p className="text-title-md-extrabold">Swipe up to reveal your word</p>
                <button type="button" onClick={() => setRoleVisible(true)} className="mt-8 grid min-h-64 w-full max-w-[25rem] place-items-center rounded-[var(--radius-card)] bg-[var(--surface-inverted)] text-[var(--text-inverted)] focus-visible:outline-3 focus-visible:outline-[var(--surface-secondary)]">
                  <Eye size={42} />
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setRoleVisible(false)} className="grid min-h-64 w-full max-w-[25rem] place-items-center rounded-[var(--radius-card)] bg-[var(--surface-inverted)] p-7 text-[var(--text-inverted)]">
                  <span>
                    <EyeOff className="mx-auto" size={32} />
                    <span className="mt-4 block text-footnote-semibold text-[var(--text-highlight)]">{personal.role === "imposter" ? "Your role is" : "Your word is"}</span>
                    <span className="mt-2 block text-title-lg-bold">{personal.role === "imposter" ? "IMPOSTER" : personal.word}</span>
                  </span>
                </button>
              </>
            )}
            <GameStatus players={`${readyCount}/${playerCount} players ready`} label={`Playing as ${currentPlayer?.name}`} />
            {!ready ? (
              <Button onClick={() => perform("ready")} disabled={!roleVisible} variant="tertiary" size="lg" showLeftIcon={false} className="mt-6 w-full max-w-[25rem]">I&apos;m Ready</Button>
            ) : !allReady ? (
              <div className="mt-6 text-title-sm-bold">Press ready when you are</div>
            ) : isHost ? (
              <div className="mt-6 w-full max-w-[25rem]">
                <p className="text-title-md-extrabold">All Players Ready</p>
                <Button onClick={() => perform("start-round")} variant="tertiary" size="lg" showLeftIcon={false} rightIcon={<Play />} className="mt-4 w-full">Start Round</Button>
              </div>
            ) : (
              <p className="mt-6 text-title-sm-bold">Waiting for the Room Owner...</p>
            )}
          </section>
        )}

        {gameState.phase === "discussion" && (
          <section className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            <p className="text-footnote-semibold text-[var(--text-highlight)]">Go clockwise</p>
            <h1 className="mt-2 text-display-md-semibold">Start from<br />{firstPlayer}</h1>
            <div className="mt-10 text-display-lg-bold tabular-nums">{formattedTime}</div>
            <p className="mt-4 max-w-sm text-body-medium opacity-65">Give clues, listen carefully, and work out who never knew the word.</p>
            {isHost && (
              <Button onClick={() => perform("start-voting")} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Vote />} className="mt-10 w-full max-w-[25rem]">
                Start Voting Round
              </Button>
            )}
          </section>
        )}

        {gameState.phase === "voting" && (
          <section className="py-8">
            <GameStatus players={`${voteCount}/${playerCount} players voted`} time={formattedTime} />
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gameState.players.map((player) => (
                <VoteCard key={player.id} player={player} selected={selectedVote === player.id} disabled={hasVoted} onClick={() => setSelectedVote(player.id)} />
              ))}
            </div>
            {!hasVoted ? (
              <Button onClick={() => perform("vote", { targetPlayerId: selectedVote })} disabled={!selectedVote} variant="tertiary" size="lg" showLeftIcon={false} rightIcon={<Vote />} className="mt-6 w-full">Cast Vote</Button>
            ) : (
              <div className="mt-10 text-center">
                <h2 className="text-title-md-extrabold">{allVoted ? "All Players Voted" : "Waiting for others"}</h2>
                <p className="mt-2 text-body-medium opacity-60">{voteCount}/{playerCount} Players Voted</p>
                {isHost && allVoted && <Button onClick={() => perform("reveal")} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Eye />} className="mt-6 w-full">See Imposter</Button>}
              </div>
            )}
          </section>
        )}

        {gameState.phase === "results" && (
          <section className="py-8 text-center">
            <p className="text-footnote-semibold text-[var(--text-highlight)]">The word was {personal.word}</p>
            <h1 className="mt-2 text-title-lg-bold">
              {(personal.imposterPlayerNames ?? []).join(", ")} {personal.imposterPlayerNames?.length === 1 ? "is" : "are"} the imposter
            </h1>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gameState.players.map((player) => <VoteCard key={player.id} player={player} votes={voteTotals[player.id] ?? 0} disabled />)}
            </div>
            {isHost && (
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Button onClick={() => { setRoleVisible(false); setSelectedVote(""); perform("next-round"); }} variant="tertiary" size="lg" showLeftIcon={false} rightIcon={<RotateCcw />}>Another Round</Button>
                <Button onClick={endGame} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Flag />}>End Game</Button>
              </div>
            )}
          </section>
        )}
      </div>
    </AppScreen>
  );
}
