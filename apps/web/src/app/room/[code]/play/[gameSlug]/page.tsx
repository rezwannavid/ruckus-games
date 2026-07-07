"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { Button } from "@/components/ui/Button";

type Player = {
  id: string;
  name: string;
  isHost: boolean;
};

type GameParticipant = {
  id: string;
  name: string;
  isHost?: boolean;
};

type Game = {
  slug: string;
  name: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
};

type Room = {
  code: string;
  players: Player[];
  status: "waiting" | "in_game" | "ended";
  selectedGame?: Game;
  gameState?: {
    playMode?: "multiplayer" | "single_device";
  };
};

type PlayerGameState = {
  gameSlug: string;
  playMode: "multiplayer" | "single_device";
  players: GameParticipant[];
  phase: "playing" | "revealed";
  role: "player" | "imposter";
  word: string | null;
  wordCategory: string;
  roundTimerSeconds: number;
  startedAt: string;
  endsAt: string;
  imposterPlayerId: string | null;
  imposterPlayerName: string | null;
  imposterPlayerIds: string[] | null;
  imposterPlayerNames: string[] | null;
};

type SingleDeviceGameState = {
  gameSlug: string;
  playMode: "single_device";
  phase: "playing" | "revealed";
  players: GameParticipant[];
  wordCategory: string;
  roundTimerSeconds: number;
  startedAt: string;
  endsAt: string;
};

type ImposterReveal = {
  word: string;
  wordCategory: string;
  roundTimerSeconds: number;
  startedAt: string;
  endsAt: string;
  imposterPlayerId: string;
  imposterPlayerName: string;
  imposterPlayerIds: string[];
  imposterPlayerNames: string[];
};

const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000";

export default function PlayGamePage({
  params
}: {
  params: Promise<{ code: string; gameSlug: string }>;
}) {
  const router = useRouter();
  const { code, gameSlug } = use(params);

  const roomCode = code.toUpperCase();

  const [room, setRoom] = useState<Room | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [playerGameState, setPlayerGameState] = useState<PlayerGameState | null>(null);
  const [singleDeviceGameState, setSingleDeviceGameState] = useState<SingleDeviceGameState | null>(null);
  const [singleDeviceRoleState, setSingleDeviceRoleState] = useState<PlayerGameState | null>(null);
  const [currentSingleDeviceIndex, setCurrentSingleDeviceIndex] = useState(0);
  const [isSingleDeviceRoleVisible, setIsSingleDeviceRoleVisible] = useState(false);
  const [imposterReveal, setImposterReveal] = useState<ImposterReveal | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [error, setError] = useState("");

  const currentPlayer = room?.players.find(
    (player) => player.id === currentPlayerId
  );

  const selectedGame = room?.selectedGame;
  const currentPlayerIsHost = Boolean(currentPlayer?.isHost);
  const isSingleDeviceMode =
    singleDeviceGameState?.playMode === "single_device" ||
    room?.gameState?.playMode === "single_device" ||
    playerGameState?.playMode === "single_device";
  const currentSingleDevicePlayer =
    singleDeviceGameState?.players[currentSingleDeviceIndex] ?? null;
  const displayedPlayers: GameParticipant[] =
    singleDeviceGameState?.players ?? room?.players ?? [];
  const allSingleDeviceRolesSeen = Boolean(
    singleDeviceGameState && currentSingleDeviceIndex >= singleDeviceGameState.players.length
  );
  const revealedImposterPlayerIds =
    imposterReveal?.imposterPlayerIds ??
    playerGameState?.imposterPlayerIds ??
    (imposterReveal?.imposterPlayerId
      ? [imposterReveal.imposterPlayerId]
      : playerGameState?.imposterPlayerId
        ? [playerGameState.imposterPlayerId]
        : []);
  const revealedImposterNames =
    imposterReveal?.imposterPlayerNames ??
    playerGameState?.imposterPlayerNames ??
    (imposterReveal?.imposterPlayerName
      ? [imposterReveal.imposterPlayerName]
      : playerGameState?.imposterPlayerName
        ? [playerGameState.imposterPlayerName]
        : []);
  const activeEndsAt = singleDeviceGameState?.endsAt ?? playerGameState?.endsAt;
  const activePhase = singleDeviceGameState?.phase ?? playerGameState?.phase;

  const formattedTimeLeft =
    timeLeft === null
      ? null
      : `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`;

  function getSyncedTimeLeft(endsAt: string) {
    const millisecondsLeft = new Date(endsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(millisecondsLeft / 1000));
  }

  useEffect(() => {
    const savedRoomCode = localStorage.getItem("ruckusRoomCode");
    const savedPlayerId = localStorage.getItem("ruckusPlayerId");

    if (savedRoomCode?.toUpperCase() !== roomCode || !savedPlayerId) {
      router.push(`/room/${roomCode}`);
      return;
    }

    setCurrentPlayerId(savedPlayerId);
  }, [roomCode, router]);

  useEffect(() => {
    async function fetchRoom() {
      setError("");

      try {
        const response = await fetch(`${serverUrl}/rooms/${roomCode}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.message ?? "Could not load room.");
          return;
        }

        setRoom(data.room);
      } catch {
        setError("Could not connect to the server.");
      }
    }

    fetchRoom();
  }, [roomCode]);

  useEffect(() => {
    async function fetchSingleDeviceGameState() {
      if (gameSlug !== "imposter" || room?.gameState?.playMode !== "single_device") return;

      setError("");

      try {
        const response = await fetch(
          `${serverUrl}/rooms/${roomCode}/single-device-game-state`
        );
        const data = await response.json();

        if (!response.ok) {
          setError(data.message ?? "Could not load pass-the-phone game state.");
          return;
        }

        setSingleDeviceGameState(data);
        setPlayerGameState(null);
        setTimeLeft(data.endsAt ? getSyncedTimeLeft(data.endsAt) : null);
      } catch {
        setError("Could not connect to the server.");
      }
    }

    fetchSingleDeviceGameState();
  }, [roomCode, room?.gameState?.playMode, gameSlug]);

  useEffect(() => {
    async function fetchPlayerGameState() {
      if (
        !currentPlayerId ||
        !room ||
        room.gameState?.playMode === "single_device" ||
        gameSlug !== "imposter"
      ) {
        return;
      }

      setError("");

      try {
        const response = await fetch(
          `${serverUrl}/rooms/${roomCode}/game-state/${currentPlayerId}`
        );
        const data = await response.json();

        if (!response.ok) {
          setError(data.message ?? "Could not load game state.");
          return;
        }

        setPlayerGameState(data);
        setSingleDeviceGameState(null);
        setTimeLeft(data.endsAt ? getSyncedTimeLeft(data.endsAt) : null);
      } catch {
        setError("Could not connect to the server.");
      }
    }

    fetchPlayerGameState();
  }, [roomCode, currentPlayerId, room, gameSlug]);

  useEffect(() => {
    const socket = io(serverUrl);

    socket.emit("room:subscribe", {
      roomCode
    });

    socket.on("room:state", (roomState: Room) => {
      setRoom(roomState);
    });

    socket.on("imposter:revealed", (reveal: ImposterReveal) => {
      setImposterReveal(reveal);
      setTimeLeft(0);
      setSingleDeviceGameState((currentState) => {
        if (!currentState) return currentState;

        return {
          ...currentState,
          phase: "revealed"
        };
      });
      setPlayerGameState((currentState) => {
        if (!currentState) return currentState;

        return {
          ...currentState,
          phase: "revealed",
          word: reveal.word,
          wordCategory: reveal.wordCategory,
          roundTimerSeconds: reveal.roundTimerSeconds,
          startedAt: reveal.startedAt,
          endsAt: reveal.endsAt,
          imposterPlayerId: reveal.imposterPlayerId,
          imposterPlayerName: reveal.imposterPlayerName,
          imposterPlayerIds: reveal.imposterPlayerIds,
          imposterPlayerNames: reveal.imposterPlayerNames
        };
      });
    });

    socket.on("game:ended", () => {
      router.push(`/room/${roomCode}`);
    });

    socket.on("room:ended", () => {
      localStorage.removeItem("ruckusPlayerId");
      localStorage.removeItem("ruckusPlayerName");
      localStorage.removeItem("ruckusRoomCode");

      router.push("/");
    });

    return () => {
      socket.disconnect();
    };
  }, [roomCode, router]);

  useEffect(() => {
    if (
      selectedGame?.slug !== "imposter" ||
      !activeEndsAt ||
      activePhase === "revealed"
    ) {
      return;
    }

    setTimeLeft(getSyncedTimeLeft(activeEndsAt));

    const timer = window.setInterval(() => {
      setTimeLeft(getSyncedTimeLeft(activeEndsAt));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [selectedGame?.slug, activeEndsAt, activePhase]);

  function goBackToRoom() {
    router.push(`/room/${roomCode}`);
  }

  async function revealSingleDeviceRole() {
    if (!currentSingleDevicePlayer) return;

    setError("");

    try {
      const response = await fetch(
        `${serverUrl}/rooms/${roomCode}/game-state/${currentSingleDevicePlayer.id}`
      );
      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Could not reveal this player's role.");
        return;
      }

      setSingleDeviceRoleState(data);
      setIsSingleDeviceRoleVisible(true);
    } catch {
      setError("Could not connect to the server.");
    }
  }

  function goToNextSingleDevicePlayer() {
    setIsSingleDeviceRoleVisible(false);
    setSingleDeviceRoleState(null);
    setCurrentSingleDeviceIndex((currentIndex) => currentIndex + 1);
  }

  function restartSingleDeviceRolePass() {
    setIsSingleDeviceRoleVisible(false);
    setSingleDeviceRoleState(null);
    setCurrentSingleDeviceIndex(0);
  }

  async function revealImposter() {
    if (!currentPlayerId) return;

    setError("");

    try {
      const response = await fetch(
        `${serverUrl}/rooms/${roomCode}/games/imposter/reveal`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            playerId: currentPlayerId
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Could not reveal imposter.");
        return;
      }

      setRoom(data.room);
      setImposterReveal(data.reveal);
      setTimeLeft(0);
      setSingleDeviceGameState((currentState) => {
        if (!currentState) return currentState;

        return {
          ...currentState,
          phase: "revealed"
        };
      });
      setPlayerGameState((currentState) => {
        if (!currentState) return currentState;

        return {
          ...currentState,
          phase: "revealed",
          word: data.reveal.word,
          wordCategory: data.reveal.wordCategory,
          roundTimerSeconds: data.reveal.roundTimerSeconds,
          startedAt: data.reveal.startedAt,
          endsAt: data.reveal.endsAt,
          imposterPlayerId: data.reveal.imposterPlayerId,
          imposterPlayerName: data.reveal.imposterPlayerName,
          imposterPlayerIds: data.reveal.imposterPlayerIds,
          imposterPlayerNames: data.reveal.imposterPlayerNames
        };
      });
    } catch {
      setError("Could not connect to the server.");
    }
  }

  async function endGame() {
    if (!currentPlayerId) return;

    setError("");

    try {
      const response = await fetch(`${serverUrl}/rooms/${roomCode}/games/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          playerId: currentPlayerId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Could not end game.");
        return;
      }

      setRoom(data.room);
      router.push(`/room/${roomCode}`);
    } catch {
      setError("Could not connect to the server.");
    }
  }

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-xl space-y-6">
          <h1 className="text-3xl font-bold">Game Error</h1>
          <p>{error}</p>

          <Button onClick={goBackToRoom} variant="inverted" size="md">
            Back to Room
          </Button>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-xl">
          <p>Loading game...</p>
        </div>
      </main>
    );
  }

  if (!selectedGame || selectedGame.slug !== gameSlug) {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-xl space-y-6">
          <h1 className="text-3xl font-bold">Game Not Active</h1>
          <p>This game is not currently active in room {room.code}.</p>

          <Button onClick={goBackToRoom} variant="inverted" size="md">
            Back to Room
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex flex-col gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm opacity-70">Room {room.code}</p>
            <h1 className="text-4xl font-bold">{selectedGame.name}</h1>
            <p className="mt-2 opacity-80">
              {isSingleDeviceMode ? (
                "Pass-the-phone mode"
              ) : (
                <>
                  Playing as <span className="font-semibold">{currentPlayer?.name}</span>
                </>
              )}
            </p>
          </div>

          <div className="space-y-2">
            {currentPlayerIsHost && (
              <p className="text-sm font-semibold opacity-70">Host Controls</p>
            )}

            <div className="flex flex-wrap gap-3">
              <Button onClick={goBackToRoom} variant="inverted" size="md">
                Back to Room
              </Button>

              {currentPlayerIsHost &&
                selectedGame.slug === "imposter" &&
                activePhase !== "revealed" && (
                  <Button onClick={revealImposter} variant="tertiary" size="md">
                    Reveal Imposter
                  </Button>
                )}

              {currentPlayerIsHost && (
                <Button onClick={endGame} variant="secondary" size="md">
                  End Game
                </Button>
              )}
            </div>
          </div>
        </header>

        <section className="rounded-2xl border p-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] opacity-60">
            Game Area
          </p>

          {selectedGame.slug === "imposter" ? (
            <div className="mt-4 space-y-4">
              {activePhase !== "revealed" && formattedTimeLeft && (
                <div className="mx-auto max-w-xs rounded-2xl border p-4">
                  <p className="text-sm uppercase tracking-[0.3em] opacity-60">
                    Timer
                  </p>
                  <p className="mt-2 text-5xl font-black">{formattedTimeLeft}</p>
                  {timeLeft === 0 && (
                    <p className="mt-2 text-sm opacity-80">
                      Time is up. The host can reveal the imposter.
                    </p>
                  )}
                </div>
              )}

              {isSingleDeviceMode ? (
                singleDeviceGameState?.phase === "revealed" || imposterReveal ? (
                  <>
                    <p className="text-sm uppercase tracking-[0.3em] opacity-60">
                      Reveal
                    </p>
                    <h2 className="text-4xl font-bold">
                      {revealedImposterNames.length === 1
                        ? `The Imposter was ${revealedImposterNames[0]}`
                        : `The Imposters were ${revealedImposterNames.join(", ")}`}
                    </h2>
                    <p className="text-2xl font-semibold">
                      The word was {imposterReveal?.word}
                    </p>
                  </>
                ) : !singleDeviceGameState ? (
                  <p className="opacity-80">Loading pass-the-phone game...</p>
                ) : allSingleDeviceRolesSeen ? (
                  <>
                    <p className="text-sm uppercase tracking-[0.3em] opacity-60">
                      All Roles Viewed
                    </p>
                    <h2 className="text-4xl font-bold">Start the discussion</h2>
                    <p className="mx-auto max-w-xl opacity-80">
                      Everyone has seen their role. Put the phone down, start
                      giving clues, and try to find the imposter.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <Button
                        onClick={restartSingleDeviceRolePass}
                        variant="inverted"
                        size="md"
                      >
                        Review Roles Again
                      </Button>
                      {currentPlayerIsHost && (
                        <Button onClick={revealImposter} variant="tertiary" size="md">
                          Reveal Imposter
                        </Button>
                      )}
                    </div>
                  </>
                ) : !isSingleDeviceRoleVisible ? (
                  <>
                    <p className="text-sm uppercase tracking-[0.3em] opacity-60">
                      Pass the phone
                    </p>
                    <h2 className="text-4xl font-bold">
                      Pass to {currentSingleDevicePlayer?.name}
                    </h2>
                    <p className="mx-auto max-w-xl opacity-80">
                      Only {currentSingleDevicePlayer?.name} should look at the
                      next screen.
                    </p>
                    <Button onClick={revealSingleDeviceRole} variant="primary" size="md">
                      Reveal My Role
                    </Button>
                  </>
                ) : singleDeviceRoleState?.role === "imposter" ? (
                  <>
                    <p className="text-sm uppercase tracking-[0.3em] opacity-60">
                      {currentSingleDevicePlayer?.name}&apos;s Role
                    </p>
                    <h2 className="text-4xl font-bold">You are the Imposter</h2>
                    <p className="mx-auto max-w-xl opacity-80">
                      You do not know the secret word. Memorize this, then hide
                      the screen before passing the phone.
                    </p>
                    <Button
                      onClick={goToNextSingleDevicePlayer}
                      variant="secondary"
                      size="md"
                    >
                      Hide & Pass Phone
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm uppercase tracking-[0.3em] opacity-60">
                      {currentSingleDevicePlayer?.name}&apos;s Secret Word
                    </p>
                    <h2 className="text-6xl font-black">{singleDeviceRoleState?.word}</h2>
                    <p className="mx-auto max-w-xl opacity-80">
                      Memorize the word. Do not say it out loud yet.
                    </p>
                    <Button
                      onClick={goToNextSingleDevicePlayer}
                      variant="secondary"
                      size="md"
                    >
                      Hide & Pass Phone
                    </Button>
                  </>
                )
              ) : !playerGameState ? (
                <p className="opacity-80">Loading your role...</p>
              ) : playerGameState.phase === "revealed" || imposterReveal ? (
                <>
                  <p className="text-sm uppercase tracking-[0.3em] opacity-60">
                    Reveal
                  </p>
                  <h2 className="text-4xl font-bold">
                    {revealedImposterNames.length === 1
                      ? `The Imposter was ${revealedImposterNames[0]}`
                      : `The Imposters were ${revealedImposterNames.join(", ")}`}
                  </h2>
                  <p className="text-2xl font-semibold">
                    The word was {imposterReveal?.word ?? playerGameState.word}
                  </p>
                </>
              ) : playerGameState.role === "imposter" ? (
                <>
                  <p className="text-sm uppercase tracking-[0.3em] opacity-60">
                    Your Role
                  </p>
                  <h2 className="text-4xl font-bold">You are the Imposter</h2>
                  <p className="mx-auto max-w-xl opacity-80">
                    You do not know the secret word. Listen carefully, blend in,
                    and try not to get caught.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm uppercase tracking-[0.3em] opacity-60">
                    Your Secret Word
                  </p>
                  <h2 className="text-6xl font-black">{playerGameState.word}</h2>
                  <p className="mx-auto max-w-xl opacity-80">
                    Do not reveal the word directly. Give clues carefully and try
                    to find the imposter.
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              <h2 className="mt-4 text-3xl font-bold">
                {selectedGame.name} UI goes here
              </h2>
              <p className="mx-auto mt-4 max-w-xl opacity-80">
                This is the shared in-game shell. The actual game interface will
                be built inside this area later.
              </p>
            </>
          )}
        </section>

        <section className="rounded-2xl border p-6">
          <h2 className="text-2xl font-semibold">Players</h2>

          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {displayedPlayers.map((player) => (
              <li
                key={player.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <span>{player.name}</span>

                <div className="flex items-center gap-2">
                  {player.id === currentPlayerId && (
                    <span className="text-sm opacity-70">You</span>
                  )}

                  {player.isHost && (
                    <span className="rounded-full border px-2 py-1 text-xs">
                      Host
                    </span>
                  )}

                  {revealedImposterPlayerIds.includes(player.id) && (
                    <span className="rounded-full border px-2 py-1 text-xs">
                      Imposter
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}