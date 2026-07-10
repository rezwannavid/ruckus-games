"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { ArrowLeft, Eye, EyeOff, Flag, Play, Send, Skull, Vote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/AvatarPicker";
import { AppScreen, ErrorState, LoadingState, PlayerStatusPill, WaitingOrbit } from "@/components/ui/GameUI";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { GameArtwork } from "@/features/lobby/components/GameArtwork";
import { serverUrl } from "@/lib/config";
import { clearRoomSession, getStoredSession } from "@/lib/session";

type Player = { id: string; name: string; avatarId?: number; isHost?: boolean; status?: "active" | "eliminated" | "disconnected" | "spectating" };
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

function WavelengthScale({
  left,
  right,
  value,
  answer,
  onChange,
  disabled,
  summaries = []
}: {
  left?: string;
  right?: string;
  value: number;
  answer?: number | null;
  onChange?: (value: number) => void;
  disabled?: boolean;
  summaries?: Array<{ playerId: string; guess: number; points: number }>;
}) {
  const showAnswer = answer !== null && answer !== undefined;
  const distance = showAnswer ? Math.abs(answer - value) : 0;
  const low = showAnswer ? Math.min(answer, value) : value;
  const high = showAnswer ? Math.max(answer, value) : value;

  return (
    <div className="rounded-[32px] bg-[var(--surface-inverted-light)] p-5 text-[var(--text-inverted)]">
      <div className="flex justify-between gap-4 text-footnote-semibold"><span>{left}</span><span>{right}</span></div>
      <div className="relative mt-10 h-16 rounded-full bg-[var(--surface-primary)]">
        {showAnswer && (
          <div
            className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-[var(--surface-secondary)]/45 transition-all duration-500"
            style={{ left: `${low}%`, width: `${Math.max(2, high - low)}%` }}
          />
        )}
        {summaries.map((summary, index) => (
          <div
            key={summary.playerId}
            className="absolute top-1/2 grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[var(--surface-inverted)] text-caption-semibold text-[var(--text-inverted)] shadow-md transition-all duration-500"
            style={{ left: `${summary.guess}%`, transform: `translate(-50%, calc(-50% + ${index * 4}px))` }}
            title={`${summary.guess}`}
          >
            {summary.points}
          </div>
        ))}
        {showAnswer && (
          <div
            className="absolute top-1/2 h-14 w-2 -translate-y-1/2 rounded-full bg-[var(--surface-secondary)] shadow-xl transition-all duration-500"
            style={{ left: `calc(${answer}% - 4px)` }}
          />
        )}
        <div
          className="absolute top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-[var(--surface-primary)] bg-[var(--surface-inverted-light)] text-caption-semibold shadow-xl transition-all duration-200"
          style={{ left: `${value}%` }}
        >
          {value}
        </div>
        {onChange && (
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(Number(event.target.value))}
            className="wavelength-slider absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
        )}
      </div>
      <div className={`mt-7 grid gap-2 text-center ${showAnswer ? "grid-cols-3" : "grid-cols-1"}`}>
        <div><p className="text-caption-semibold opacity-60">Guess</p><p className="text-title-sm-bold">{value}</p></div>
        {showAnswer && <div><p className="text-caption-semibold opacity-60">Answer</p><p className="text-title-sm-bold">{answer}</p></div>}
        {showAnswer && <div><p className="text-caption-semibold opacity-60">Distance</p><p className="text-title-sm-bold">{distance}</p></div>}
      </div>
    </div>
  );
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
  const [holdingReveal, setHoldingReveal] = useState(false);
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

  const formattedTime = `${Math.floor(timeLeft / 60)}m ${String(timeLeft % 60).padStart(2, "0")}s`;
  const ready = Boolean(currentPlayerId && gameState.readyPlayerIds?.includes(currentPlayerId));
  const firstPlayer = gameState.players[gameState.round % gameState.players.length]?.name ?? gameState.players[0]?.name;

  if (personal.isEliminated && gameState.phase !== "results") {
    return (
      <AppScreen tone="dark" className="grid place-items-center">
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
            <BrandNav tone="dark" />
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
            <BrandNav title="Answer Privately" tone="dark" centerTitle />
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
                className="min-h-36 w-full resize-none rounded-[28px] bg-[var(--surface-primary-light)] px-5 py-4 text-title-sm-semibold outline-none placeholder:text-white/20 focus-visible:outline-3 focus-visible:outline-[var(--surface-secondary)]"
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
        <AppScreen tone="accent" className="!p-0">
          <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col rounded-[48px] px-4 pb-safe pt-16 text-center">
            <BrandNav title="Answers" tone="light" centerTitle />
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
            <BrandNav tone="light" />
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
            <BrandNav tone="dark" />
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
            <BrandNav title="Cast your Vote" tone="dark" centerTitle />
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
          <BrandNav title="Results" tone="light" centerTitle />
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
              onEndGame={endGame}
              onLeave={() => router.push(`/room/${roomCode}`)}
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
            <BrandNav title="Round Start" tone="light" centerTitle />
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
        <AppScreen tone="dark" className="!p-0">
          <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col rounded-[48px] px-4 pb-safe pt-20 text-center">
            <BrandNav title="Wavelength" tone="dark" centerTitle />
            <div className="mx-auto mt-8 w-24"><GameArtwork gameSlug="wavelength" tone="light" /></div>
            <p className="mt-8 text-body-semibold opacity-60">Scale</p>
            <h1 className="mt-2 text-title-lg-bold text-[var(--text-highlight)]">{gameState.scaleLeft} ↔ {gameState.scaleRight}</h1>
            {personal.isClueGiver ? (
              <>
                <div className="mt-8 rounded-[30px] bg-[var(--surface-primary-light)] p-5">
                  <div className="flex justify-between text-footnote-semibold opacity-70"><span>{gameState.scaleLeft}</span><span>{gameState.scaleRight}</span></div>
                  <div className="relative mt-6 h-12 rounded-full bg-[var(--surface-primary)]">
                    {secretVisible && <div className="absolute top-1/2 h-14 w-2 -translate-y-1/2 rounded-full bg-[var(--surface-secondary)] transition-all duration-500" style={{ left: `calc(${secretNumber}% - 4px)` }} />}
                  </div>
                  <output className="mt-5 block text-display-md-semibold">{secretVisible ? secretNumber : "??"}</output>
                </div>
                <Button onClick={() => setSecretVisible((value) => !value)} variant="inverted" size="md" showLeftIcon={false} rightIcon={secretVisible ? <EyeOff /> : <Eye />} className="mx-auto mt-4">{secretVisible ? "Hide" : "Reveal"}</Button>
                <input value={clueText} onChange={(event) => setClueText(event.target.value)} placeholder="Give a clue..." maxLength={80} className="mt-8 h-16 w-full rounded-[24px] bg-[var(--surface-primary-light)] px-5 text-center text-headline-md-bold outline-none placeholder:text-white/20 focus-visible:outline-3 focus-visible:outline-[var(--surface-secondary)]" />
                <Button onClick={() => { perform("submit-clue", { clue: clueText }); setClueText(""); setSecretVisible(false); }} disabled={!clueText.trim() || pendingAction !== null} variant="tertiary" size="lg" showLeftIcon={false} rightIcon={<Send />} className="mt-auto w-full">{pendingAction === "submit-clue" ? "Sending..." : "Send Clue"}</Button>
              </>
            ) : (
              <>
                <p className="mt-8 text-title-sm-bold">Waiting for {gameState.clueGiverName}</p>
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
              <BrandNav title="Wavelength" tone="dark" centerTitle />
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
        <AppScreen tone="dark" className="!p-0">
          <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col rounded-[48px] px-4 pb-safe pt-16 text-center">
            <BrandNav title="Make a Guess" tone="dark" centerTitle />
            <div className="mt-10">
              <p className="text-footnote-semibold opacity-40">Time</p>
              <p className="text-title-lg-semibold tabular-nums">{formattedTime}</p>
            </div>
            <p className="mt-10 text-body-semibold opacity-60">Clue</p>
            <h1 className="mt-2 text-title-lg-bold text-[var(--text-highlight)]">{gameState.clue}</h1>
            <div className="mt-12 animate-pop">
              <WavelengthScale left={gameState.scaleLeft} right={gameState.scaleRight} value={guess} onChange={setGuess} />
            </div>
            <div className="mt-auto">
              <PlayerStatusPill players={gameState.players} completedIds={submittedGuessIds} label={`${submittedGuessIds.length}/${eligibleGuesserIds.length} guessed`} />
              <Button onClick={() => perform("submit-guess", { guess })} disabled={pendingAction !== null} variant="primary" size="lg" showLeftIcon={false} rightIcon={<Flag />} className="w-full">{pendingAction === "submit-guess" ? "Locking..." : "Submit Guess"}</Button>
            </div>
          </section>
        </AppScreen>
      );
    }

    return (
      <AppScreen tone="accent" className="!p-0">
        <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col rounded-[48px] px-4 pb-safe pt-16 text-center">
          <BrandNav title="Results" tone="light" centerTitle />
          {finalRound && <p className="mt-8 animate-pop text-headline-md-bold">{winnerNames.length > 1 ? `Tie: ${winnerNames.join(" & ")}` : `${winnerNames[0]} wins!`}</p>}
          <h1 className={`${finalRound ? "mt-5" : "mt-12"} text-title-lg-bold`}>{gameState.scaleLeft} ↔ {gameState.scaleRight}</h1>
          <p className="mt-3 text-headline-md-bold">Clue: {gameState.clue}</p>
          <div className="mt-12 animate-pop">
            <WavelengthScale
              left={gameState.scaleLeft}
              right={gameState.scaleRight}
              value={gameState.guess ?? gameState.guessSummary?.[0]?.guess ?? 50}
              answer={secretNumber}
              summaries={gameState.guessSummary ?? []}
            />
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
                <Button onClick={endGame} disabled={pendingAction !== null} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Flag />}>{pendingAction === "end-game" ? "Ending..." : "End Game"}</Button>
              </>
            ) : (
              <Button onClick={() => router.push(`/room/${roomCode}`)} variant="inverted" size="lg" showLeftIcon={false} className="col-span-2 w-full">Leave Game</Button>
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
                {activePlayers.map((player) => {
                  const isReady = gameState.readyPlayerIds?.includes(player.id);
                  return <span key={player.id} className="grid size-7 place-items-center rounded-full bg-[var(--surface-inverted-light)]"><Avatar avatarId={player.avatarId ?? 1} size="sm" tone={isReady ? "black" : "muted"} /></span>;
                })}
              </div>
              <span className="ml-2 whitespace-nowrap text-caption-semibold">{readyCount}/{activePlayerCount} players ready</span>
            </div>
            {!ready && !hasSeenRole && <p className="text-title-md-extrabold">Swipe up to<br />reveal your word</p>}
            {!ready && hasSeenRole && !holdingReveal && <p className="text-title-md-extrabold">Press ready when<br />you are</p>}
            {ready && !allReady && <p className="text-title-md-extrabold">Waiting for<br />other players</p>}
            {ready && allReady && <p className="text-title-md-extrabold">All Players Ready</p>}
          </div>

          <div className="relative z-20 mt-auto px-4">
            {!ready ? (
              <Button onClick={() => perform("ready")} disabled={!hasSeenRole || holdingReveal || pendingAction !== null} variant="primary" size="lg" showLeftIcon={false} className="w-full">{pendingAction === "ready" ? "Saving..." : "I'm Ready"}</Button>
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
          <BrandNav tone="light" />
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
          <BrandNav tone="dark" />
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
          <BrandNav title="Cast your Vote" tone="dark" centerTitle />
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
        <BrandNav title="Results" tone="light" centerTitle />
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
            onEndGame={endGame}
            onLeave={() => router.push(`/room/${roomCode}`)}
          />
        </div>
      </section>
    </AppScreen>
  );
}
