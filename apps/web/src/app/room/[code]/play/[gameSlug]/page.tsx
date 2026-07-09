"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { ArrowLeft, Eye, Flag, Play, Skull, Vote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/AvatarPicker";
import { AppScreen, ErrorState, LoadingState, PlayerStatusPill, WaitingOrbit } from "@/components/ui/GameUI";
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
  answerRevealed: boolean;
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
  caughtImposter?: boolean;
  topVotedPlayerIds?: string[];
  answerRevealed: boolean;
};

export default function PlayGamePage({ params }: { params: Promise<{ code: string; gameSlug: string }> }) {
  const router = useRouter();
  const { code, gameSlug } = use(params);
  const roomCode = code.toUpperCase();
  const [room, setRoom] = useState<Room | null>(null);
  const [personal, setPersonal] = useState<PersonalState | null>(null);
  const [currentPlayerId] = useState(() => getStoredSession().roomCode?.toUpperCase() === roomCode ? getStoredSession().playerId : null);
  const [holdingReveal, setHoldingReveal] = useState(false);
  const [hasSeenRole, setHasSeenRole] = useState(false);
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
    if (!gameState?.endsAt || !["discussion", "voting"].includes(gameState.phase)) return;
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

  if (gameState.phase === "role_reveal") {
    const roleText = personal.role === "imposter" ? "IMPOSTER" : personal.word;
    return (
      <AppScreen tone="dark" className="overflow-hidden !p-0">
        <div className="relative flex min-h-screen w-full flex-col bg-[var(--surface-primary)] pb-6">
          <div className="absolute inset-x-0 top-0 flex h-[72%] items-center justify-center px-6 text-center">
            <div><p className="text-headline-md-bold">Your {personal.role === "imposter" ? "role" : "word"} is</p><p className="mt-2 break-words text-display-md-semibold">{roleText}</p></div>
          </div>

          <div
            role="button"
            tabIndex={0}
            aria-label="Hold to reveal your role"
            onPointerDown={(event) => { if (ready) return; event.currentTarget.setPointerCapture(event.pointerId); setHoldingReveal(true); }}
            onPointerUp={() => { if (ready) return; setHoldingReveal(false); setHasSeenRole(true); }}
            onPointerCancel={() => { setHoldingReveal(false); setHasSeenRole(true); }}
            className={`absolute inset-x-0 top-0 z-10 flex h-[85%] w-full touch-none items-center justify-center rounded-b-[60px] bg-[var(--surface-secondary)] px-8 text-center transition-transform duration-300 ease-out ${holdingReveal ? "-translate-y-[72%]" : "translate-y-0"}`}
          >
            {isHost && (
              <div className="absolute left-1/2 top-20 flex -translate-x-1/2 gap-2">
                <Button onClick={endGame} variant="inverted" size="md" showLeftIcon={false} rightIcon={<Skull size={17} />}>End Game</Button>
                <Button onClick={() => router.push(`/room/${roomCode}`)} variant="inverted" size="md" showLeftIcon={false} rightIcon={<Skull size={17} />}>Go to Room</Button>
              </div>
            )}
            <div className="absolute left-1/2 top-[144px] flex -translate-x-1/2 items-center rounded-full bg-[var(--surface-inverted)] px-3 py-2 text-[var(--text-inverted)]">
              <div className="flex -space-x-2">
                {gameState.players.map((player) => <span key={player.id} className={`grid size-7 place-items-center rounded-full bg-[var(--surface-inverted-light)] ${gameState.readyPlayerIds.includes(player.id) ? "opacity-100" : "opacity-20"}`}><Avatar avatarId={player.avatarId ?? 1} size="sm" /></span>)}
              </div>
              <span className="ml-2 whitespace-nowrap text-caption-semibold">{readyCount}/{playerCount} players ready</span>
            </div>
            {!ready && !hasSeenRole && <p className="text-title-md-extrabold">Swipe up to<br />reveal your word</p>}
            {!ready && hasSeenRole && !holdingReveal && <p className="text-title-md-extrabold">Press ready when<br />you are</p>}
            {ready && !allReady && <p className="text-title-md-extrabold">Waiting for<br />other players</p>}
            {ready && allReady && <p className="text-title-md-extrabold">All Players Ready</p>}
          </div>

          <div className="relative z-20 mt-auto px-4">
            {!ready ? (
              <Button onClick={() => perform("ready")} disabled={!hasSeenRole || holdingReveal} variant="primary" size="lg" showLeftIcon={false} className="w-full">I&apos;m Ready</Button>
            ) : allReady && isHost ? (
              <Button onClick={() => perform("start-round")} variant="tertiary" size="lg" showLeftIcon={false} rightIcon={<Play />} className="w-full">Start Round</Button>
            ) : (
              <Button disabled variant="primary" size="lg" showLeftIcon={false} className="w-full">Waiting...</Button>
            )}
          </div>
        </div>
      </AppScreen>
    );
  }

  if (gameState.phase === "discussion") {
    return (
      <AppScreen tone="light" className="!p-0">
        <section className="mx-auto flex min-h-screen w-full max-w-[25rem] flex-col rounded-[48px] px-4 pb-7 pt-20 text-center">
          {isHost && (
            <div className="flex justify-center gap-2">
              <Button onClick={endGame} variant="inverted" size="md" showLeftIcon={false} rightIcon={<Skull size={16} />}>End Game</Button>
              <Button onClick={() => router.push(`/room/${roomCode}`)} variant="inverted" size="md" showLeftIcon={false} rightIcon={<Skull size={16} />}>Go to Room</Button>
            </div>
          )}
          <div className="flex flex-1 flex-col items-center justify-center">
            <Avatar avatarId={gameState.players.find((player) => player.name === firstPlayer)?.avatarId ?? 1} name={firstPlayer} size="lg" />
            <h1 className="mt-7 text-title-lg-bold text-[var(--text-highlight)]">Start from<br />{firstPlayer}</h1>
            <p className="mt-3 text-headline-md-bold text-[var(--text-highlight)]">Go clockwise</p>
            <p className="mt-8 text-title-sm-bold tabular-nums">{formattedTime}</p>
          </div>
          {isHost ? (
            <Button onClick={() => perform("start-voting")} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Vote />} className="w-full">Start Voting Round</Button>
          ) : (
            <p className="pb-6 text-body-semibold opacity-60">Waiting for the room owner</p>
          )}
        </section>
      </AppScreen>
    );
  }

  if (gameState.phase === "voting" && hasVoted && allVoted) {
    return (
      <AppScreen tone="blue" className="!p-0">
        <section className="mx-auto flex min-h-screen w-full max-w-[25rem] flex-col rounded-[48px] px-4 pb-7 pt-20 text-center">
          <BrandNav tone="light" />
          <h1 className="my-auto text-title-md-extrabold">All Players<br />Voted</h1>
          {isHost ? (
            <Button onClick={() => perform("reveal")} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Eye />} className="w-full">See Imposter</Button>
          ) : (
            <Button disabled variant="inverted" size="lg" showLeftIcon={false} className="w-full">Waiting for Host</Button>
          )}
        </section>
      </AppScreen>
    );
  }

  if (gameState.phase === "voting" && hasVoted) {
    return (
      <AppScreen tone="dark" className="!p-0">
        <section className="mx-auto flex min-h-screen w-full max-w-[25rem] flex-col rounded-[48px] px-4 pb-7 pt-20 text-center">
          <BrandNav tone="dark" />
          <div className="mt-16">
            <p className="text-footnote-semibold opacity-40">Time</p>
            <p className="text-title-lg-semibold tabular-nums">{formattedTime}</p>
          </div>
          <div className="flex flex-1 items-center">
            <WaitingOrbit players={gameState.players} completedIds={Object.keys(gameState.votes)} title="Waiting for others" subtitle={`${voteCount}/${playerCount} Players Voted`} />
          </div>
          <Button disabled variant="primary" size="lg" showLeftIcon={false} className="w-full">See Imposter</Button>
        </section>
      </AppScreen>
    );
  }

  if (gameState.phase === "voting") {
    return (
      <AppScreen tone="dark" className="!p-0">
        <section className="mx-auto flex min-h-screen w-full max-w-[25rem] flex-col rounded-[48px] px-4 pb-7 pt-20">
          <BrandNav title="Cast your Vote" tone="dark" />
          <div className="mt-14 text-center">
            <p className="text-footnote-semibold opacity-40">Time</p>
            <p className="text-title-lg-semibold tabular-nums">{formattedTime}</p>
          </div>
          <div className="mt-16 space-y-2">
            {gameState.players.map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => setSelectedVote(player.id)}
                aria-pressed={selectedVote === player.id}
                className="flex h-[68px] w-full items-center justify-center gap-4 rounded-[24px] border-2 border-transparent bg-[var(--surface-primary-light)] text-headline-md-semibold transition aria-pressed:border-[var(--surface-secondary)]"
              >
                <Avatar avatarId={player.avatarId ?? 1} name={player.name} tone="white" />
                <span>{player.name}</span>
              </button>
            ))}
          </div>
          <div className="mt-auto">
            <PlayerStatusPill players={gameState.players} completedIds={Object.keys(gameState.votes)} label={`${voteCount}/${playerCount} players voted`} />
            <Button onClick={() => perform("vote", { targetPlayerId: selectedVote })} disabled={!selectedVote} variant="primary" size="lg" showLeftIcon={false} className="w-full">Cast Vote</Button>
          </div>
        </section>
      </AppScreen>
    );
  }

  const answerVisible = personal.answerRevealed || personal.caughtImposter;
  const topVotedPlayer = gameState.players.find((player) => personal.topVotedPlayerIds?.includes(player.id));
  const sortedPlayers = [...gameState.players].sort((a, b) => (voteTotals[b.id] ?? 0) - (voteTotals[a.id] ?? 0));
  const revealedNames = personal.imposterPlayerNames ?? [];
  const resultTone = answerVisible ? "blue" : "light";

  return (
    <AppScreen tone={resultTone} className="!p-0">
      <section className="mx-auto flex min-h-screen w-full max-w-[25rem] flex-col rounded-[48px] px-4 pb-7 pt-16 text-center">
        <BrandNav title="Results" tone="light" />
        <div className="mt-10">
          <Avatar
            avatarId={(answerVisible
              ? gameState.players.find((player) => personal.imposterPlayerIds?.includes(player.id))
              : topVotedPlayer)?.avatarId ?? 1}
            name={answerVisible ? revealedNames[0] : topVotedPlayer?.name}
            size="lg"
            tone={answerVisible ? "black" : "blue"}
            className="mx-auto !size-[132px]"
          />
          {answerVisible ? (
            <>
              <h1 className="mt-5 text-title-lg-bold">
                {revealedNames.join(", ")} {revealedNames.length === 1 ? "is" : "are"} the <span className="text-[var(--surface-inverted-light)]">imposter</span>
              </h1>
              <p className="mt-3 text-headline-md-bold">The word was {personal.word}</p>
            </>
          ) : (
            <h1 className="mt-5 text-title-lg-bold">
              {topVotedPlayer?.name ?? "That player"} is <span className="text-[var(--text-highlight)]">not</span><br />the imposter
            </h1>
          )}
        </div>

        <div className="mt-8 space-y-2">
          {sortedPlayers.map((player) => {
            const votes = voteTotals[player.id] ?? 0;
            return (
              <div
                key={player.id}
                className={`flex h-[68px] items-center justify-center gap-4 rounded-[24px] ${answerVisible ? "bg-[var(--primitive-blue-800)] text-[var(--text-primary)]" : "bg-[var(--surface-inverted-light)]"} ${votes === 0 ? "opacity-40" : ""}`}
              >
                <Avatar avatarId={player.avatarId ?? 1} name={player.name} tone={answerVisible ? "white" : "black"} />
                <div className="text-left">
                  <p className="text-headline-md-semibold">{player.name}</p>
                  {votes > 0 && <p className="text-caption-semibold text-[var(--text-highlight)]">{votes} Vote{votes === 1 ? "" : "s"}</p>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-8">
          {isHost ? (
            <>
              <Button onClick={() => { setSelectedVote(""); perform("next-round"); }} variant={answerVisible ? "primary" : "inverted"} size="lg" showLeftIcon={false} showRightIcon={false}>Another Round</Button>
              {answerVisible ? (
                <Button onClick={endGame} variant={answerVisible ? "primary" : "inverted"} size="lg" showLeftIcon={false} rightIcon={<Flag />}>End Game</Button>
              ) : (
                <Button onClick={() => perform("reveal-answer")} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Skull />}>Reveal</Button>
              )}
            </>
          ) : (
            <Button onClick={() => router.push(`/room/${roomCode}`)} variant="inverted" size="lg" showLeftIcon={false} className="col-span-2 w-full">Leave Game</Button>
          )}
        </div>
      </section>
    </AppScreen>
  );
}
