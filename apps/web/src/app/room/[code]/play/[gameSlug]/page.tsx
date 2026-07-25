"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { ArrowLeft, Eye, EyeOff, FastForward, Flag, LogOut, Play, Send, Skull, UserMinus, Users, Vote, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/AvatarPicker";
import { AppScreen, ErrorState, LoadingState, PlayerStatusPill, WaitingOrbit } from "@/components/ui/GameUI";
import { WavelengthBoard } from "@/components/ui/WavelengthBoard";
import { SwipeReveal } from "@/components/ui/SwipeReveal";
import { Dialog } from "@/components/ui/Dialog";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { GameArtwork } from "@/features/lobby/components/GameArtwork";
import { serverUrl } from "@/lib/config";
import { clearRoomSession, getStoredSession } from "@/lib/session";

type Player = { id: string; name: string; avatarId?: number; isHost?: boolean; status?: "active" | "eliminated" | "disconnected" | "spectating" | "left" | "kicked"; removedByHost?: boolean };
type WavelengthResult = { playerId: string; playerName: string; avatarId?: number; teamId: "team-1" | "team-2" | null; teamName: string | null; guess: number; target: number; distance: number; roundPoints: number; totalPoints: number; rank: number; isClosest: boolean; isTied: boolean };
type GameState = {
  type: "imposter" | "imposter-code" | "wavelength";
  playMode: "multiplayer" | "single_device";
  phase: string;
  players: Player[];
  wordCategory?: string;
  roundTimerSeconds?: number;
  startedAt?: string;
  endsAt?: string;
  readyPlayerIds?: string[];
  votes?: Record<string, string>;
  round: number;
  answerRevealed?: boolean;
  answers?: Record<string, string>;
  answeredPlayerIds?: string[];
  submittedAnswer?: string | null;
  question?: string | null;
  prompt?: string | null;
  imposterQuestion?: string | null;
  clueGiverId?: string;
  clueGiverName?: string;
  mode?: "teams" | "single";
  activeTeamId?: "team-1" | "team-2" | null;
  teams?: Record<"team-1" | "team-2", string[]>;
  teamNames?: Record<"team-1" | "team-2", string>;
  scaleLeft?: string;
  scaleRight?: string;
  secretNumber?: number | null;
  clue?: string | null;
  guess?: number | null;
  guesses?: Record<string, number>;
  guessSummary?: Array<{ playerId: string; guess: number; distance: number; points: number }>;
  resultSummary?: WavelengthResult[];
  eligibleGuesserIds?: string[];
  score?: number;
  teamScores?: Record<"team-1" | "team-2", number>;
  playerScores?: Record<string, number>;
  maxRounds?: number;
  isComplete?: boolean;
  eliminatedPlayerIds?: string[];
  eliminatedPlayerId?: string | null;
  isEliminated?: boolean;
  gameOver?: boolean;
  winner?: "players" | "imposters" | null;
  acceptedGuessPlayerId?: string | null;
  lastRoundScore?: number;
  lastClueGiverPoints?: number;
  roundHistory?: Array<{ round: number; target: number; guess: number | null; distance: number | null; roundScore: number; clueGiverPoints: number }>;
};
type Room = {
  code: string;
  name?: string;
  players: Player[];
  status: "waiting" | "in_game" | "ended";
  selectedGame?: { slug: string; name: string };
  gameState?: GameState;
  lastGameEndedByHost?: boolean;
};
type PersonalState = GameState & {
  role?: "player" | "imposter";
  word?: string | null;
  prompt?: string | null;
  question?: string | null;
  answers?: Record<string, string>;
  imposterQuestion?: string | null;
  imposterPlayerIds?: string[] | null;
  imposterPlayerNames?: string[] | null;
  caughtImposter?: boolean;
  topVotedPlayerIds?: string[];
  answerRevealed?: boolean;
  isClueGiver?: boolean;
  isEligibleGuesser?: boolean;
  hasSubmittedGuess?: boolean;
  playerTeamId?: "team-1" | "team-2" | null;
};

function AnimatedScore({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const reducedFrame = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(reducedFrame);
    }
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / 550);
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{prefix}{display}</>;
}

function DeductionActions({
  isHost,
  fullResult,
  pendingAction,
  onAnotherGuess,
  onRevealResult,
  onAnotherRound,
  onEndGame,
  onLeave
}: {
  isHost: boolean;
  fullResult: boolean;
  pendingAction: string | null;
  onAnotherGuess: () => void;
  onRevealResult: () => void;
  onAnotherRound: () => void;
  onEndGame: () => void;
  onLeave: () => void;
}) {
  if (!isHost) {
    return <Button onClick={onLeave} variant="inverted" size="lg" showLeftIcon={false} className="w-full">Leave Game</Button>;
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {fullResult ? (
        <>
          <Button onClick={onAnotherRound} disabled={pendingAction !== null} variant="primary" size="lg" showLeftIcon={false} showRightIcon={false}>{pendingAction === "next-round" ? "Starting..." : "Another round"}</Button>
          <Button onClick={onEndGame} disabled={pendingAction !== null} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Flag />}>{pendingAction === "end-game" ? "Ending..." : "End game"}</Button>
        </>
      ) : (
        <>
          <Button onClick={onAnotherGuess} disabled={pendingAction !== null} variant="primary" size="lg" showLeftIcon={false} showRightIcon={false}>{pendingAction === "another-guess" ? "Starting..." : "Another guess"}</Button>
          <Button onClick={onRevealResult} disabled={pendingAction !== null} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Eye />}>{pendingAction === "reveal-answer" ? "Revealing..." : "Reveal result"}</Button>
        </>
      )}
    </div>
  );
}

export default function PlayGamePage({ params }: { params: Promise<{ code: string; gameSlug: string }> }) {
  const router = useRouter();
  const { code, gameSlug } = use(params);
  const roomCode = code.toUpperCase();
  const [room, setRoom] = useState<Room | null>(null);
  const [personal, setPersonal] = useState<PersonalState | null>(null);
  const [currentPlayerId] = useState(() => getStoredSession().roomCode?.toUpperCase() === roomCode ? getStoredSession().playerId : null);
  const [hasSeenRole, setHasSeenRole] = useState(false);
  const [selectedVote, setSelectedVote] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [isAnswerSubmitting, setIsAnswerSubmitting] = useState(false);
  const [clueText, setClueText] = useState("");
  const [guess, setGuess] = useState(50);
  const [secretVisible, setSecretVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState("");
  const [ended, setEnded] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showPlayers, setShowPlayers] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"end-game" | "leave-game" | "leave-room" | null>(null);

  const gameState = room?.gameState;
  const currentPlayer = room?.players.find((player) => player.id === currentPlayerId);
  const isHost = Boolean(currentPlayer?.isHost);
  const hasVoted = Boolean(currentPlayerId && gameState?.votes?.[currentPlayerId]);
  const readyCount = gameState?.readyPlayerIds?.length ?? 0;
  const voteCount = gameState ? Object.keys(gameState.votes ?? {}).length : 0;
  const activePlayers = gameState?.players.filter((player) => !gameState.eliminatedPlayerIds?.includes(player.id)) ?? [];
  const activePlayerCount = activePlayers.length;
  const allReady = activePlayerCount > 0 && readyCount === activePlayerCount;
  const allVoted = activePlayerCount > 0 && voteCount === activePlayerCount;

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
    socket.emit("room:subscribe", { roomCode, playerId: currentPlayerId });
    socket.on("room:state", (nextRoom: Room) => {
      setRoom(nextRoom);
      if (nextRoom.status === "waiting" && nextRoom.lastGameEndedByHost) setEnded(true);
      setError("");
    });
    socket.on("game:ended", () => setEnded(true));
    socket.on("room:ended", () => {
      clearRoomSession();
      router.push("/");
    });
    socket.on("room:removed", (payload: { playerId: string; message: string }) => {
      if (payload.playerId === currentPlayerId) {
        clearRoomSession();
        setError(payload.message);
        router.push("/");
      }
    });
    socket.on("room:error", (payload: { message: string }) => setError(payload.message));
    return () => {
      socket.disconnect();
    };
  }, [currentPlayerId, roomCode, router]);

  useEffect(() => {
    if (!currentPlayerId || !gameState) return;
    fetch(`${serverUrl}/rooms/${roomCode}/game-state/${currentPlayerId}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        setPersonal(data);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load your role."));
  }, [currentPlayerId, gameSlug, gameState, roomCode]);

  useEffect(() => {
    if (!gameState?.endsAt || !["discussion", "voting", "answers", "guess"].includes(gameState.phase)) return;
    const update = () => setTimeLeft(Math.max(0, Math.ceil((new Date(gameState.endsAt ?? "").getTime() - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [gameState?.endsAt, gameState?.phase]);

  async function post(action: string, body: Record<string, unknown> = {}) {
    if (!currentPlayerId) return;
    setError("");
    const response = await fetch(`${serverUrl}/rooms/${roomCode}/games/${gameSlug}/${action}`, {
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
    if (pendingAction) return;
    setPendingAction(action);
    try {
      await post(action, body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That action failed.");
    } finally {
      setPendingAction(null);
    }
  }

  async function submitImposterCodeAnswer() {
    if (!answerText.trim() || isAnswerSubmitting) return;
    setIsAnswerSubmitting(true);
    try {
      await post("submit-answer", { answer: answerText });
      setAnswerText("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That action failed.");
    } finally {
      setIsAnswerSubmitting(false);
    }
  }

  async function endGame() {
    if (!currentPlayerId || pendingAction) return;
    setPendingAction("end-game");
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
    } finally {
      setPendingAction(null);
    }
  }

  async function roomAction(path: string, method = "POST", body: Record<string, unknown> = {}) {
    if (!currentPlayerId || pendingAction) return;
    setPendingAction(path);
    try {
      const response = await fetch(`${serverUrl}/rooms/${roomCode}/${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: currentPlayerId, ...body })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      if (data.room) setRoom(data.room);
      return data;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "That action failed.");
    } finally {
      setPendingAction(null);
    }
  }

  async function confirmLifecycleAction() {
    const action = confirmAction;
    setConfirmAction(null);
    if (action === "end-game") return endGame();
    if (action === "leave-game") {
      await roomAction("games/leave");
      router.push(`/room/${roomCode}`);
    }
    if (action === "leave-room") {
      await roomAction("leave");
      clearRoomSession();
      router.push("/");
    }
  }

  if (ended) {
    return (
      <AppScreen tone="accent" className="grid place-items-center">
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

  const actionCompletedIds = gameState.phase === "answering"
    ? Object.keys(gameState.answers ?? {})
    : gameState.phase === "voting"
      ? Object.keys(gameState.votes ?? {})
      : gameState.phase === "role_reveal"
        ? gameState.readyPlayerIds ?? []
        : gameState.phase === "guess"
          ? Object.keys(gameState.guesses ?? {})
          : [];
  const universalControls = (
    <>
      <div className="fixed right-4 top-[calc(var(--safe-top)+1rem)] z-[70]">
        <button type="button" onClick={() => setShowPlayers(true)} aria-label="View room" className="flex h-[33px] items-center gap-1.5 rounded-[17px] bg-[var(--surface-primary)] px-3 text-caption-semibold text-[var(--text-primary)] shadow-lg transition hover:scale-105 active:scale-95">View Room <Users size={13} /></button>
      </div>
      <Dialog open={showPlayers} onClose={() => setShowPlayers(false)} title={`Players in room ${roomCode}`} sheet className="max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between"><div><p className="text-title-sm-bold">Players</p><p className="text-caption-semibold opacity-60">Room {roomCode} · Round {gameState.round}</p></div><button type="button" onClick={() => setShowPlayers(false)} className="grid size-10 place-items-center rounded-full bg-black/10" aria-label="Close"><X /></button></div>
            <div className="mt-5 space-y-2">
              {gameState.players.map((player) => {
                const teamId = gameState.type === "wavelength" ? (gameState.teams?.["team-1"]?.includes(player.id) ? "Team 1" : gameState.teams?.["team-2"]?.includes(player.id) ? "Team 2" : null) : null;
                const done = actionCompletedIds.includes(player.id);
                return <div key={player.id} className="flex items-center gap-3 rounded-[22px] bg-white/80 p-3 text-black"><Avatar avatarId={player.avatarId ?? 1} name={player.name} /><div className="min-w-0 flex-1"><p className="truncate text-headline-md-semibold">{player.name} {player.isHost ? "· Host" : ""}</p><p className="text-caption-semibold opacity-55">{player.status ?? "active"}{teamId ? ` · ${teamId}` : ""}{done ? " · Done" : ""}</p></div>{isHost && !player.isHost && !["left", "kicked"].includes(player.status ?? "") && <button type="button" onClick={() => roomAction(`players/${player.id}`, "DELETE")} disabled={pendingAction !== null} className="grid size-10 place-items-center rounded-full bg-[#ffddd7] text-[#b42318] transition active:scale-90" aria-label={`Remove ${player.name}`}><UserMinus size={18} /></button>}</div>;
              })}
            </div>
            {isHost && <Button onClick={() => roomAction("games/advance")} disabled={pendingAction !== null} variant="primary" size="lg" showLeftIcon={false} rightIcon={<FastForward />} className="mt-5 w-full">Move Game Forward</Button>}
            <div className="mt-2 grid grid-cols-2 gap-2"><Button onClick={() => { setShowPlayers(false); setConfirmAction("leave-game"); }} variant="inverted" size="md" showLeftIcon={false}>Leave Game</Button><Button onClick={() => { setShowPlayers(false); setConfirmAction("leave-room"); }} variant="inverted" size="md" showLeftIcon={false} rightIcon={<LogOut />}>Leave Room</Button></div>
      </Dialog>
      <Dialog open={confirmAction !== null} onClose={() => setConfirmAction(null)} title="Are you sure?" description={confirmAction === "end-game" ? "The current round stops for everyone." : "Confirm leaving the current game."} alert className="p-6 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--state-danger-surface)] text-[var(--state-danger-text)]"><Flag /></div><h2 className="mt-4 text-title-sm-bold">Are you sure?</h2><p className="mt-2 text-body-semibold opacity-65">{confirmAction === "end-game" ? "The current round stops for everyone, but the room and completed history stay safe." : confirmAction === "leave-game" ? "You will leave this game but stay in the room." : "You will leave the room. The game continues for everyone else."}</p><div className="mt-6 grid grid-cols-2 gap-2"><Button onClick={() => setConfirmAction(null)} variant="inverted" size="md" showLeftIcon={false}>Cancel</Button><Button onClick={confirmLifecycleAction} variant="primary" size="md" showLeftIcon={false}>Confirm</Button></div>
      </Dialog>
    </>
  );

  if (gameState.phase === "rules") {
    const rules = gameState.type === "imposter" ? ["Everyone gets a secret word—except the imposters.", "Give clues without making the word obvious.", "Vote out every imposter before they take over."] : gameState.type === "imposter-code" ? ["Answer your private prompt without revealing it.", "One or more players receive a closely related prompt.", "Compare answers and vote for the imposters."] : ["The clue giver sees a secret number on the scale.", "Give one clue that points everyone toward it.", "Closest guesses earn the biggest points."];
    return <>{universalControls}<AppScreen tone="light" className="grid place-items-center"><section className="w-full max-w-[25rem] animate-spring-in"><div className="mx-auto w-28"><GameArtwork gameSlug={gameSlug} /></div><p className="mt-6 text-center text-caption-semibold uppercase tracking-[0.18em] opacity-60">How to play</p><h1 className="mt-2 text-center text-title-lg-bold">Ready for a ruckus?</h1><div className="mt-7 space-y-3">{rules.map((rule, index) => <div key={rule} className="ruckus-paper flex gap-4 rounded-[24px] p-4"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--surface-secondary)] text-headline-md-bold">{index + 1}</span><p className="text-body-semibold">{rule}</p></div>)}</div>{isHost ? <Button onClick={() => roomAction("games/continue")} disabled={pendingAction !== null} variant="tertiary" size="lg" showLeftIcon={false} rightIcon={<Play />} className="mt-8 w-full">{pendingAction ? "Starting..." : "Start Game"}</Button> : <div className="mt-8 rounded-full bg-black/10 px-5 py-4 text-center text-body-semibold">Waiting for the host to start…</div>}</section></AppScreen></>;
  }

  const formattedTime = `${Math.floor(timeLeft / 60)}m ${String(timeLeft % 60).padStart(2, "0")}s`;
  const ready = Boolean(currentPlayerId && gameState.readyPlayerIds?.includes(currentPlayerId));
  const firstPlayer = gameState.players[gameState.round % gameState.players.length]?.name ?? gameState.players[0]?.name;

  if (personal.isEliminated && gameState.phase !== "results") {
    return (
      <AppScreen tone="dark" className="grid place-items-center">
        {universalControls}
        <section className="w-full max-w-[25rem] text-center">
          <Avatar avatarId={currentPlayer?.avatarId ?? 1} name={currentPlayer?.name} size="lg" tone="accent" className="mx-auto !size-[132px] opacity-55" />
          <h1 className="mt-7 text-title-lg-bold">You are eliminated.</h1>
          <p className="mt-3 text-body-semibold opacity-60">You are still in the room and can watch the rest of the game.</p>
          <div className="mt-8 rounded-full bg-[var(--surface-primary-light)] px-5 py-3 text-footnote-semibold text-[var(--text-highlight)]">Round {gameState.round} · Spectating</div>
        </section>
      </AppScreen>
    );
  }

  if (gameState.type === "imposter-code") {
    const answers = personal.answers ?? {};
    const submittedAnswer = Boolean(personal.submittedAnswer || (currentPlayerId && answers[currentPlayerId]));
    const answeredPlayerIds = personal.answeredPlayerIds ?? Object.keys(answers);
    const answerCount = answeredPlayerIds.length;
    const fullResult = Boolean(personal.answerRevealed);
    const guessedImposter = Boolean(personal.caughtImposter);
    const topVotedPlayer = gameState.players.find((player) => personal.topVotedPlayerIds?.includes(player.id));
    const revealedNames = personal.imposterPlayerNames ?? [];

    if (gameState.phase === "answering" && submittedAnswer) {
      return (
        <AppScreen tone="dark" className="!p-0">
          <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col rounded-[48px] px-4 pb-safe pt-20 text-center">
            <BrandNav tone="dark" />{universalControls}
            <div className="flex flex-1 items-center">
              <WaitingOrbit players={activePlayers} completedIds={answeredPlayerIds} title="Answer submitted" subtitle={`${answerCount}/${activePlayerCount} Players Answered`} />
            </div>
            <Button disabled variant="primary" size="lg" showLeftIcon={false} className="w-full">Answers locked</Button>
          </section>
        </AppScreen>
      );
    }

    if (gameState.phase === "answering") {
      return (
        <AppScreen tone="dark" className="!p-0">
          <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col rounded-[48px] px-4 pb-safe pt-20">
            <BrandNav title="Answer Privately" tone="dark" centerTitle />{universalControls}
            <div className="mt-16 text-center">
              <div className="mx-auto w-24"><GameArtwork gameSlug="imposter-code" tone="light" /></div>
              <p className="mt-6 text-title-md-extrabold text-[var(--text-highlight)]">{personal.prompt}</p>
            </div>
            <label className="mt-10 block">
              <span className="sr-only">Your answer</span>
              <textarea
                value={answerText}
                onChange={(event) => setAnswerText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submitImposterCodeAnswer();
                  }
                }}
                placeholder="Type your answer..."
                maxLength={120}
                disabled={isAnswerSubmitting}
                className="min-h-36 w-full resize-none rounded-[28px] bg-[var(--surface-primary)] px-5 py-4 text-title-sm-semibold text-[var(--text-primary)] outline-none placeholder:text-white/20 focus-visible:outline-3 focus-visible:outline-[var(--surface-secondary)]"
              />
            </label>
            <div className="mt-auto">
              <Button onClick={submitImposterCodeAnswer} disabled={!answerText.trim() || isAnswerSubmitting} variant="tertiary" size="lg" showLeftIcon={false} rightIcon={<Send />} className="w-full">{isAnswerSubmitting ? "Submitting..." : "Submit Answer"}</Button>
            </div>
          </section>
        </AppScreen>
      );
    }

    if (gameState.phase === "answers") {
      return (
        <AppScreen tone="light" className="!p-0">
          <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col rounded-[48px] px-4 pb-safe pt-16 text-center">
            <BrandNav title="Answers" tone="light" centerTitle />{universalControls}
            <h1 className="mt-8 text-title-sm-bold">{personal.question}</h1>
            <div className="mt-7 space-y-2 text-left">
              {activePlayers.map((player) => (
                <div key={player.id} className="animate-pop rounded-[24px] bg-[var(--surface-inverted-light)] p-5 text-[var(--text-inverted)]">
                  <div className="flex items-center gap-3">
                    <Avatar avatarId={player.avatarId ?? 1} name={player.name} tone="black" />
                    <p className="text-headline-md-bold">{player.name}</p>
                  </div>
                  <p className="mt-3 text-body-semibold">{answers[player.id]}</p>
                </div>
              ))}
            </div>
            <div className="mt-auto pt-6">
              {isHost ? (
                <Button onClick={() => perform("start-voting")} disabled={pendingAction !== null} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Vote />} className="w-full">{pendingAction === "start-voting" ? "Starting..." : "Start Voting"}</Button>
              ) : (
                <p className="pb-6 text-body-semibold opacity-60">Waiting for the room owner</p>
              )}
            </div>
          </section>
        </AppScreen>
      );
    }

    if (gameState.phase === "voting" && hasVoted && allVoted) {
      return (
        <AppScreen tone="accent" className="!p-0">
          <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col rounded-[48px] px-4 pb-safe pt-20 text-center">
            <BrandNav tone="light" />{universalControls}
            <h1 className="my-auto text-title-md-extrabold">All Players<br />Voted</h1>
            {isHost ? (
              <Button onClick={() => perform("reveal")} disabled={pendingAction !== null} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Eye />} className="w-full">{pendingAction === "reveal" ? "Revealing..." : "See Result"}</Button>
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
          <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col rounded-[48px] px-4 pb-safe pt-20 text-center">
            <BrandNav tone="dark" />{universalControls}
            <div className="flex flex-1 items-center">
              <WaitingOrbit players={activePlayers} completedIds={Object.keys(gameState.votes ?? {})} title="Waiting for others" subtitle={`${voteCount}/${activePlayerCount} Players Voted`} />
            </div>
            <Button disabled variant="primary" size="lg" showLeftIcon={false} className="w-full">Vote locked</Button>
          </section>
        </AppScreen>
      );
    }

    if (gameState.phase === "voting") {
      return (
        <AppScreen tone="dark" className="!p-0">
          <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col rounded-[48px] px-4 pb-safe pt-20">
            <BrandNav title="Cast your Vote" tone="dark" centerTitle />{universalControls}
            <p className="mt-8 text-center text-body-semibold opacity-60">Who had the odd answer?</p>
            <div className="mt-10 space-y-2">
              {activePlayers.map((player) => (
                <button key={player.id} type="button" onClick={() => setSelectedVote(player.id)} aria-pressed={selectedVote === player.id} className="flex h-[68px] w-full items-center justify-center gap-4 rounded-[24px] border-2 border-transparent bg-[var(--surface-primary-light)] text-headline-md-semibold transition aria-pressed:border-[var(--surface-secondary)] aria-pressed:scale-[0.99]">
                  <Avatar avatarId={player.avatarId ?? 1} name={player.name} tone="white" />
                  <span>{player.name}</span>
                </button>
              ))}
            </div>
            <div className="mt-auto">
              <PlayerStatusPill players={activePlayers} completedIds={Object.keys(gameState.votes ?? {})} label={`${voteCount}/${activePlayerCount} players voted`} />
              <Button onClick={() => perform("vote", { targetPlayerId: selectedVote })} disabled={!selectedVote || pendingAction !== null} variant="primary" size="lg" showLeftIcon={false} className="w-full">{pendingAction === "vote" ? "Submitting..." : "Cast Vote"}</Button>
            </div>
          </section>
        </AppScreen>
      );
    }

    return (
      <AppScreen tone={fullResult || guessedImposter ? "accent" : "light"} className="!p-0">
        <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col rounded-[48px] px-4 pb-safe pt-16 text-center">
          <BrandNav title="Results" tone="light" centerTitle />{universalControls}
          <div className="mt-10">
            <Avatar avatarId={topVotedPlayer?.avatarId ?? 1} name={topVotedPlayer?.name} size="lg" tone={fullResult || guessedImposter ? "black" : "accent"} className="mx-auto !size-[132px] animate-spring-in" />
            {fullResult ? (
              <>
                <h1 className="mt-5 text-title-lg-bold">{revealedNames.join(", ")} {revealedNames.length === 1 ? "had" : "had"} the <span className="text-[var(--surface-inverted-light)]">imposter code</span></h1>
                <p className="mt-3 text-body-bold">Real prompt: {personal.question}</p>
                <p className="mt-1 text-body-semibold opacity-70">Imposter prompt: {personal.imposterQuestion}</p>
              </>
            ) : guessedImposter ? (
              <h1 className="mt-5 text-title-lg-bold">{topVotedPlayer?.name ?? "That player"} had the <span className="text-[var(--surface-inverted-light)]">imposter code</span></h1>
            ) : (
              <h1 className="mt-5 text-title-lg-bold">{topVotedPlayer?.name ?? "That player"} is <span className="text-[var(--text-highlight)]">not</span><br />the imposter</h1>
            )}
          </div>
          <div className="mt-8 space-y-2">
            {gameState.players.map((player) => {
              const votes = voteTotals[player.id] ?? 0;
              const eliminated = gameState.eliminatedPlayerIds?.includes(player.id);
              return (
                <div key={player.id} className={`rounded-[24px] p-4 text-left transition duration-300 ${eliminated ? "bg-[#dededb] text-[#777773]" : "bg-[var(--surface-inverted-light)] text-[var(--text-inverted)]"} ${personal.topVotedPlayerIds?.includes(player.id) ? "ring-[3px] ring-[var(--color-game-accent)]" : ""}`}>
                  <div className="flex items-center gap-3">
                    <Avatar avatarId={player.avatarId ?? 1} name={player.name} tone={eliminated ? "muted" : "black"} />
                    <div>
                      <p className="text-headline-md-semibold">{player.name}</p>
                      <p className="text-caption-semibold text-[var(--text-highlight)]">{votes} Vote{votes === 1 ? "" : "s"}</p>
                      {eliminated && <p className="text-caption-semibold">Eliminated</p>}
                    </div>
                  </div>
                  <p className="mt-3 text-body-semibold">{answers[player.id]}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-auto pt-8">
            <DeductionActions
              isHost={isHost}
              fullResult={fullResult}
              pendingAction={pendingAction}
              onAnotherGuess={() => { setSelectedVote(""); perform("another-guess"); }}
              onRevealResult={() => perform("reveal-answer")}
              onAnotherRound={() => { setSelectedVote(""); perform("next-round"); }}
              onEndGame={() => setConfirmAction("end-game")}
              onLeave={() => setConfirmAction("leave-game")}
            />
          </div>
        </section>
      </AppScreen>
    );
  }

  if (gameState.type === "wavelength") {
    const secretNumber = personal.secretNumber ?? gameState.secretNumber ?? 50;
    const submittedGuessIds = Object.keys(gameState.guesses ?? {});
    const eligibleGuesserIds = gameState.eligibleGuesserIds ?? [];
    const activeTeamName = gameState.activeTeamId ? gameState.teamNames?.[gameState.activeTeamId] ?? "Active Team" : "Everyone";
    const finalRound = Boolean(personal.isComplete) || (gameState.round ?? 1) >= (gameState.maxRounds ?? 1);
    const scoreRows = gameState.mode === "teams"
      ? [
          { id: "team-1", name: gameState.teamNames?.["team-1"] ?? "First Team", score: gameState.teamScores?.["team-1"] ?? 0, members: (gameState.teams?.["team-1"] ?? []).map((id) => gameState.players.find((player) => player.id === id)?.name).filter(Boolean) },
          { id: "team-2", name: gameState.teamNames?.["team-2"] ?? "Second Team", score: gameState.teamScores?.["team-2"] ?? 0, members: (gameState.teams?.["team-2"] ?? []).map((id) => gameState.players.find((player) => player.id === id)?.name).filter(Boolean) }
        ]
      : gameState.players
          .map((player) => ({ id: player.id, name: player.name, score: gameState.playerScores?.[player.id] ?? 0, avatarId: player.avatarId, roundPoints: gameState.guessSummary?.find((summary) => summary.playerId === player.id)?.points ?? 0 }))
          .sort((a, b) => b.score - a.score);
    const rankedScoreRows = [...scoreRows].sort((a, b) => b.score - a.score);
    const winningScore = rankedScoreRows[0]?.score ?? 0;
    const winnerNames = rankedScoreRows.filter((row) => row.score === winningScore).map((row) => row.name);

    if (gameState.phase === "announcement") {
      return (
        <AppScreen tone="accent" className="!p-0">
          <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col px-4 pb-safe pt-16 text-center">
            <BrandNav title="Round Start" tone="light" centerTitle />{universalControls}
            <div className="my-auto animate-spring-in">
              <div className="mx-auto mb-7 flex w-fit -space-x-3">
                {(gameState.activeTeamId ? gameState.teams?.[gameState.activeTeamId] ?? [] : []).map((id) => {
                  const player = gameState.players.find((item) => item.id === id);
                  return player ? <span key={id} className="grid size-16 place-items-center rounded-full bg-[var(--surface-inverted-light)]"><Avatar avatarId={player.avatarId ?? 1} name={player.name} size="lg" /></span> : null;
                })}
              </div>
              <h1 className="text-title-lg-bold">{activeTeamName} is guessing this round.</h1>
              <p className="mt-4 text-body-semibold opacity-70">{gameState.clueGiverName} gives the clue. The first eligible teammate to submit locks the guess.</p>
            </div>
            {isHost ? <Button onClick={() => perform("start-round")} disabled={pendingAction !== null} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Play />} className="w-full">{pendingAction === "start-round" ? "Starting..." : "Start Round"}</Button> : <Button disabled variant="inverted" size="lg" showLeftIcon={false} className="w-full">Waiting for Host</Button>}
          </section>
        </AppScreen>
      );
    }

    if (gameState.phase === "clue") {
      return (
        <AppScreen tone="light" className="!p-0">
          <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col overflow-hidden rounded-[48px] px-4 pb-safe pt-20 text-center">
            <BrandNav title="Set Rules" tone="dark" />{universalControls}
            {personal.isClueGiver ? (
              <>
                <div className="-mx-4 mt-5">
                  <WavelengthBoard
                    left={gameState.scaleLeft}
                    right={gameState.scaleRight}
                    value={secretNumber}
                    hideValue={!secretVisible}
                    compact
                    label={secretVisible ? `Secret number ${secretNumber}` : "Secret number hidden"}
                  />
                </div>
                <Button onClick={() => setSecretVisible((value) => !value)} variant={secretVisible ? "inverted" : "primary"} size="md" showLeftIcon={false} rightIcon={secretVisible ? <EyeOff /> : <Eye />} className="mx-auto -mt-1 min-w-[132px]">{secretVisible ? "Hide" : "See number"}</Button>
                <label className="relative mt-14 block">
                  <span className="sr-only">Your clue</span>
                  <textarea value={clueText} onChange={(event) => setClueText(event.target.value)} placeholder="Your answer" maxLength={80} rows={2} className="min-h-20 w-full resize-none border-b border-[var(--border-primary)] bg-transparent px-4 pb-4 text-center text-title-md-bold outline-none placeholder:text-[var(--text-inverted)]/12 focus:border-[var(--surface-secondary)]" />
                  <span className="absolute bottom-1 right-1 text-caption-regular opacity-35">{clueText.length}/80</span>
                </label>
                <Button onClick={() => { perform("submit-clue", { clue: clueText }); setClueText(""); setSecretVisible(false); }} disabled={!clueText.trim() || pendingAction !== null} variant="tertiary" size="lg" showLeftIcon={false} rightIcon={<Send />} className="mt-auto w-full">{pendingAction === "submit-clue" ? "Sending..." : "Submit"}</Button>
              </>
            ) : (
              <>
                <div className="flex flex-1 items-center">
                  <WaitingOrbit players={gameState.players} completedIds={[]} title={`Waiting for ${gameState.clueGiverName}`} subtitle="The secret number is being turned into a clue" />
                </div>
                <p className="mt-2 text-body-semibold opacity-60">
                  {gameState.mode === "teams" ? `${activeTeamName} is giving this clue.` : "The clue-giver is preparing the scale."}
                </p>
                <div className="mt-auto"><Button disabled variant="inverted" size="lg" showLeftIcon={false} className="w-full">Waiting for clue</Button></div>
              </>
            )}
          </section>
        </AppScreen>
      );
    }

    if (gameState.phase === "guess") {
      if (!personal.isEligibleGuesser || personal.hasSubmittedGuess) {
        return (
          <AppScreen tone="dark" className="!p-0">
            <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col rounded-[48px] px-4 pb-safe pt-20 text-center">
              <BrandNav title="Wavelength" tone="dark" centerTitle />{universalControls}
              <div className="mt-16">
                <p className="text-footnote-semibold opacity-40">Time</p>
                <p className="text-title-lg-semibold tabular-nums">{formattedTime}</p>
              </div>
              <div className="flex flex-1 items-center">
                <WaitingOrbit
                  players={gameState.players}
                  completedIds={submittedGuessIds}
                  title={personal.hasSubmittedGuess ? "Waiting for others" : "Waiting for guessers"}
                  subtitle={`${submittedGuessIds.length}/${eligibleGuesserIds.length} Players Guessed`}
                />
              </div>
              <Button disabled variant="inverted" size="lg" showLeftIcon={false} className="w-full">
                {personal.hasSubmittedGuess ? "Guess locked" : "Waiting"}
              </Button>
            </section>
          </AppScreen>
        );
      }

      return (
        <AppScreen tone="light" className="!p-0">
          <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col overflow-hidden rounded-[48px] px-4 pb-safe pt-20 text-center">
            <BrandNav title="Wavelength" tone="dark" />{universalControls}
            <div className="mt-10">
              <p className="text-body-regular">{gameState.clueGiverName}&apos;s Answer</p>
              <h1 className="mx-auto mt-2 max-w-[18rem] text-title-md-bold">{gameState.clue}</h1>
              <p className="mt-3 text-footnote-semibold opacity-45">{formattedTime}</p>
            </div>
            <div className="-mx-4 mt-5 animate-pop">
              <WavelengthBoard left={gameState.scaleLeft} right={gameState.scaleRight} value={guess} onChange={setGuess} label={`Guess for ${gameState.clue}`} />
            </div>
            <div className="mt-auto">
              <PlayerStatusPill players={gameState.players} completedIds={submittedGuessIds} label={`${submittedGuessIds.length}/${eligibleGuesserIds.length} guessed`} />
              <Button onClick={() => perform("submit-guess", { guess })} disabled={pendingAction !== null} variant="tertiary" size="lg" showLeftIcon={false} rightIcon={<Flag />} className="w-full">{pendingAction === "submit-guess" ? "Locking..." : "guess"}</Button>
            </div>
          </section>
        </AppScreen>
      );
    }

    return (
      <AppScreen tone="light" className="!p-0">
        <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col rounded-[48px] px-4 pb-safe pt-16 text-center">
          <BrandNav title="Results" tone="light" centerTitle />{universalControls}
          {finalRound && <p className="mt-8 animate-pop text-headline-md-bold">{winnerNames.length > 1 ? `Tie: ${winnerNames.join(" & ")}` : `${winnerNames[0]} wins!`}</p>}
          <p className={`${finalRound ? "mt-5" : "mt-10"} text-body-regular`}>{gameState.clueGiverName}&apos;s Answer</p>
          <h1 className="mx-auto mt-1 max-w-[18rem] text-title-sm-bold">{gameState.clue}</h1>
          <div className="-mx-4 mt-3 animate-pop">
            <WavelengthBoard
              left={gameState.scaleLeft}
              right={gameState.scaleRight}
              value={gameState.guess ?? gameState.guessSummary?.[0]?.guess ?? 50}
              target={secretNumber}
              markers={(gameState.resultSummary ?? []).map((result) => ({
                id: result.playerId,
                name: result.teamName ?? result.playerName,
                avatarId: result.avatarId,
                value: result.guess,
                points: result.roundPoints,
                delta: result.distance,
                highlighted: result.isClosest
              }))}
              compact
              label={`Results. Answer ${secretNumber}`}
            />
          </div>
          <div className="stagger-children -mt-2 space-y-0 text-left">
            {(gameState.resultSummary ?? []).map((result) => {
              const identity = result.teamName ?? result.playerName;
              return <div key={result.playerId} className="flex min-h-[61px] items-center gap-3 border-b border-[var(--border-primary)] px-1 py-2 text-[var(--text-inverted)]"><span className="w-5 text-center text-caption-semibold opacity-45">{result.rank}</span>{result.teamId ? <span className="grid size-9 place-items-center rounded-full bg-[var(--surface-primary)] text-caption-semibold text-[var(--text-primary)]">{result.teamId === "team-1" ? "T1" : "T2"}</span> : <Avatar avatarId={result.avatarId ?? 1} name={result.playerName} />}<div className="min-w-0 flex-1"><p className="truncate text-headline-md-semibold">{identity}{result.isTied ? " · Tie" : ""}</p></div><div className="w-12 text-center"><p className="text-caption-regular opacity-50">Guess</p><p className="text-body-semibold">{result.guess}</p><p className="text-caption-regular opacity-35">+{result.distance}</p></div><div className={`w-11 text-center ${result.isClosest ? "rounded-full bg-[var(--surface-secondary)] py-1" : ""}`}><p className="text-caption-regular opacity-50">Points</p><p className="text-title-sm-bold"><AnimatedScore value={result.roundPoints} /></p></div></div>;
            })}
          </div>
          <p className="mt-3 text-footnote-semibold opacity-70">{finalRound ? "Final standings" : `Round ${gameState.round}/${gameState.maxRounds}`}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-[22px] bg-[var(--surface-primary)] px-4 py-4 text-[var(--text-primary)]"><p className="text-caption-semibold opacity-60">Round Score</p><p className="mt-1 text-title-md-extrabold">+{gameState.lastRoundScore ?? 0}</p></div>
            <div className="rounded-[22px] bg-[var(--surface-primary)] px-4 py-4 text-[var(--text-primary)]"><p className="text-caption-semibold opacity-60">Clue-Giver Bonus</p><p className="mt-1 text-title-md-extrabold">+{gameState.lastClueGiverPoints ?? 0}</p></div>
          </div>
          <div className="mt-7 space-y-2">
            {rankedScoreRows.map((row) => (
              <div key={row.id} className="flex min-h-[64px] items-center rounded-[24px] bg-[var(--surface-inverted-light)] px-4 py-2 text-[var(--text-inverted)] transition-transform duration-300">
                <span className="w-7 text-left text-body-bold">{rankedScoreRows.findIndex((candidate) => candidate.score === row.score) + 1}</span>
                {"avatarId" in row && <Avatar avatarId={row.avatarId ?? 1} name={row.name} tone="black" />}
                <span className="ml-3 flex-1 text-left">
                  <span className="block text-headline-md-semibold">{row.name}</span>
                  {"members" in row && <span className="block text-caption-regular opacity-60">{row.members.join(", ")}</span>}
                  {"roundPoints" in row && gameState.phase === "results" && <span className="block text-caption-semibold text-[var(--text-highlight)]">+{row.roundPoints} this round</span>}
                </span>
                <span className="text-title-sm-bold">{row.score}</span>
              </div>
            ))}
          </div>
          <div className={`mt-auto grid gap-2 pt-6 ${finalRound ? "grid-cols-1" : "grid-cols-2"}`}>
            {isHost ? (
              <>
                {!finalRound && <Button onClick={() => perform("next-round")} disabled={pendingAction !== null} variant="primary" size="lg" showLeftIcon={false} showRightIcon={false}>{pendingAction === "next-round" ? "Starting..." : "Next Round"}</Button>}
                <Button onClick={() => setConfirmAction("end-game")} disabled={pendingAction !== null} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Flag />}>{pendingAction === "end-game" ? "Ending..." : "End Game"}</Button>
              </>
            ) : (
              <Button onClick={() => setConfirmAction("leave-game")} variant="inverted" size="lg" showLeftIcon={false} className="col-span-2 w-full">Leave Game</Button>
            )}
          </div>
        </section>
      </AppScreen>
    );
  }

  if (gameState.phase === "role_reveal") {
    const roleText = personal.role === "imposter" ? "IMPOSTER" : personal.word;
    return (
      <AppScreen tone="dark" className="overflow-hidden !p-0">
        <div className="relative flex min-h-screen w-full flex-col bg-[var(--surface-primary)] pb-safe">
          <SwipeReveal
            className="h-[calc(100dvh-7rem)] min-h-[620px]"
            revealed={hasSeenRole}
            disabled={ready}
            onReveal={() => setHasSeenRole(true)}
            label={`Swipe up or press Enter to reveal your ${personal.role === "imposter" ? "role" : "word"}`}
            cover={
              <div className="relative flex h-full items-center justify-center rounded-b-[60px] bg-[var(--surface-secondary)] px-8 text-center">
                {isHost && (
                  <div className="absolute left-1/2 top-20 flex -translate-x-1/2 gap-2">
                    <Button onClick={endGame} variant="inverted" size="md" showLeftIcon={false} rightIcon={<Skull size={17} />}>End Game</Button>
                    <Button onClick={() => router.push(`/room/${roomCode}`)} variant="inverted" size="md" showLeftIcon={false}>Go to Room</Button>
                  </div>
                )}
                <div className="absolute left-1/2 top-[144px] flex -translate-x-1/2 items-center rounded-full bg-[var(--surface-inverted)] px-3 py-2 text-[var(--text-inverted)]">
                  <div className="flex -space-x-2">
                    {activePlayers.map((player) => {
                      const isReady = gameState.readyPlayerIds?.includes(player.id);
                      return <span key={player.id} className="grid size-7 place-items-center rounded-full bg-[var(--surface-inverted-light)]"><Avatar avatarId={player.avatarId ?? 1} size="sm" tone={isReady ? "black" : "muted"} /></span>;
                    })}
                  </div>
                  <span className="ml-2 whitespace-nowrap text-caption-semibold">{readyCount}/{activePlayerCount} players ready</span>
                </div>
                <p className="text-title-md-extrabold">{ready ? (allReady ? "All Players Ready" : "Waiting for other players") : "Swipe up to reveal your word"}<br /><span className="text-body-semibold opacity-55">or press Enter</span></p>
              </div>
            }
          >
            <div className="flex h-[72%] items-center justify-center px-6 text-center">
              <div><p className="text-headline-md-bold">Your {personal.role === "imposter" ? "role" : "word"} is</p><p className="mt-2 break-words text-display-md-semibold">{roleText}</p></div>
            </div>
          </SwipeReveal>
          <div className="relative z-20 mt-auto px-4">
            {!ready ? (
              <Button onClick={() => perform("ready")} disabled={!hasSeenRole || pendingAction !== null} variant="primary" size="lg" showLeftIcon={false} className="w-full">{pendingAction === "ready" ? "Saving..." : "I'm Ready"}</Button>
            ) : allReady && isHost ? (
              <Button onClick={() => perform("start-round")} disabled={pendingAction !== null} variant="tertiary" size="lg" showLeftIcon={false} rightIcon={<Play />} className="w-full">{pendingAction === "start-round" ? "Starting..." : "Start Round"}</Button>
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
            <h1 className="mt-7 text-title-lg-bold text-[var(--text-inverted-plus)]">Start from<br />{firstPlayer}</h1>
            <p className="mt-3 text-headline-md-bold text-[var(--text-inverted-plus)]">Go clockwise</p>
            <p className="mt-8 text-title-sm-bold tabular-nums">{formattedTime}</p>
          </div>
          {isHost ? (
            <Button onClick={() => perform("start-voting")} disabled={pendingAction !== null} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Vote />} className="w-full">{pendingAction === "start-voting" ? "Starting..." : "Start Voting Round"}</Button>
          ) : (
            <p className="pb-6 text-body-semibold opacity-60">Waiting for the room owner</p>
          )}
        </section>
      </AppScreen>
    );
  }

  if (gameState.phase === "voting" && hasVoted && allVoted) {
    return (
      <AppScreen tone="accent" className="!p-0">
        <section className="mx-auto flex min-h-screen w-full max-w-[25rem] flex-col rounded-[48px] px-4 pb-7 pt-20 text-center">
          <BrandNav tone="light" />{universalControls}
          <h1 className="my-auto text-title-md-extrabold">All Players<br />Voted</h1>
          {isHost ? (
            <Button onClick={() => perform("reveal")} disabled={pendingAction !== null} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Eye />} className="w-full">{pendingAction === "reveal" ? "Revealing..." : "See Imposter"}</Button>
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
          <BrandNav tone="dark" />{universalControls}
          <div className="mt-16">
            <p className="text-footnote-semibold opacity-40">Time</p>
            <p className="text-title-lg-semibold tabular-nums">{formattedTime}</p>
          </div>
          <div className="flex flex-1 items-center">
            <WaitingOrbit players={activePlayers} completedIds={Object.keys(gameState.votes ?? {})} title="Waiting for others" subtitle={`${voteCount}/${activePlayerCount} Players Voted`} />
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
          <BrandNav title="Cast your Vote" tone="dark" centerTitle />{universalControls}
          <div className="mt-14 text-center">
            <p className="text-footnote-semibold opacity-40">Time</p>
            <p className="text-title-lg-semibold tabular-nums">{formattedTime}</p>
          </div>
          <div className="mt-16 space-y-2">
            {activePlayers.map((player) => (
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
            <PlayerStatusPill players={activePlayers} completedIds={Object.keys(gameState.votes ?? {})} label={`${voteCount}/${activePlayerCount} players voted`} />
            <Button onClick={() => perform("vote", { targetPlayerId: selectedVote })} disabled={!selectedVote || pendingAction !== null} variant="primary" size="lg" showLeftIcon={false} className="w-full">{pendingAction === "vote" ? "Submitting..." : "Cast Vote"}</Button>
          </div>
        </section>
      </AppScreen>
    );
  }

  const fullResult = Boolean(personal.answerRevealed);
  const guessedImposter = Boolean(personal.caughtImposter);
  const topVotedPlayer = gameState.players.find((player) => personal.topVotedPlayerIds?.includes(player.id));
  const revealedNames = personal.imposterPlayerNames ?? [];
  const resultTone = fullResult || guessedImposter ? "accent" : "light";

  return (
    <AppScreen tone={resultTone} className="!p-0">
      <section className="mx-auto flex min-h-screen w-full max-w-[25rem] flex-col rounded-[48px] px-4 pb-7 pt-16 text-center">
        <BrandNav title="Results" tone="light" centerTitle />{universalControls}
        <div className="mt-10">
          <Avatar
            avatarId={topVotedPlayer?.avatarId ?? 1}
            name={topVotedPlayer?.name}
            size="lg"
            tone={fullResult || guessedImposter ? "black" : "accent"}
            className="mx-auto !size-[132px] animate-spring-in"
          />
          {fullResult ? (
            <>
              <h1 className="mt-5 text-title-lg-bold">
                {revealedNames.join(", ")} {revealedNames.length === 1 ? "is" : "are"} the <span className="text-[var(--surface-inverted-light)]">imposter</span>
              </h1>
              <p className="mt-3 text-headline-md-bold">The word was {personal.word}</p>
            </>
          ) : guessedImposter ? (
            <h1 className="mt-5 text-title-lg-bold">{topVotedPlayer?.name ?? "That player"} is an <span className="text-[var(--surface-inverted-light)]">imposter</span></h1>
          ) : (
            <h1 className="mt-5 text-title-lg-bold">
              {topVotedPlayer?.name ?? "That player"} is <span className="text-[var(--text-highlight)]">not</span><br />the imposter
            </h1>
          )}
        </div>

        <div className="mt-8 space-y-2">
          {gameState.players.map((player) => {
            const votes = voteTotals[player.id] ?? 0;
            const eliminated = gameState.eliminatedPlayerIds?.includes(player.id);
            return (
              <div
                key={player.id}
                className={`flex min-h-[68px] items-center justify-center gap-4 rounded-[24px] px-4 py-3 transition duration-300 ${eliminated ? "bg-[#dededb] text-[#777773]" : "bg-[var(--surface-inverted-light)] text-[var(--text-inverted)]"} ${personal.topVotedPlayerIds?.includes(player.id) ? "ring-[3px] ring-[var(--color-game-accent)]" : ""}`}
              >
                <Avatar avatarId={player.avatarId ?? 1} name={player.name} tone={eliminated ? "muted" : "black"} />
                <div className="text-left">
                  <p className="text-headline-md-semibold">{player.name}</p>
                  {votes > 0 && <p className="text-caption-semibold text-[var(--text-highlight)]">{votes} Vote{votes === 1 ? "" : "s"}</p>}
                  {eliminated && <p className="text-caption-semibold">Eliminated</p>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-auto pt-8">
          <DeductionActions
            isHost={isHost}
            fullResult={fullResult}
            pendingAction={pendingAction}
            onAnotherGuess={() => { setSelectedVote(""); perform("another-guess"); }}
            onRevealResult={() => perform("reveal-answer")}
            onAnotherRound={() => { setSelectedVote(""); perform("next-round"); }}
            onEndGame={() => setConfirmAction("end-game")}
            onLeave={() => setConfirmAction("leave-game")}
          />
        </div>
      </section>
    </AppScreen>
  );
}
