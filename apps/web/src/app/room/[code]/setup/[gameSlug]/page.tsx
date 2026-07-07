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
};

const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000";

export default function GameSetupPage({
  params
}: {
  params: Promise<{ code: string; gameSlug: string }>;
}) {
  const router = useRouter();
  const { code, gameSlug } = use(params);

  const roomCode = code.toUpperCase();

  const [room, setRoom] = useState<Room | null>(null);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [playMode, setPlayMode] = useState<"multiplayer" | "single_device">("multiplayer");
  const [manualPlayerName, setManualPlayerName] = useState("");
  const [manualPlayers, setManualPlayers] = useState<string[]>([]);
  const [numberOfImposters, setNumberOfImposters] = useState("1");
  const [roundTimer, setRoundTimer] = useState("60");
  const [wordCategory, setWordCategory] = useState("random");

  const currentPlayer = room?.players.find(
    (player) => player.id === currentPlayerId
  );

  const currentPlayerIsHost = Boolean(currentPlayer?.isHost);
  const selectedGame = room?.selectedGame;
  const activePlayerCount =
    playMode === "single_device" ? manualPlayers.length : room?.players.length ?? 0;
  const hasEnoughPlayers = selectedGame
    ? activePlayerCount >= selectedGame.minPlayers
    : false;
  const maxImposters = Math.max(1, activePlayerCount - 1);

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
    if (playMode !== "single_device" || !room || manualPlayers.length > 0) {
      return;
    }

    setManualPlayers(room.players.map((player) => player.name));
  }, [playMode, room, manualPlayers.length]);

  useEffect(() => {
    const socket = io(serverUrl);

    socket.emit("room:subscribe", {
      roomCode
    });

    socket.on("room:state", (roomState: Room) => {
      setRoom(roomState);
    });

    socket.on("game:started", (payload: { game: Game }) => {
      router.push(`/room/${roomCode}/play/${payload.game.slug}`);
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

  function goBackToRoom() {
    router.push(`/room/${roomCode}`);
  }

  function addManualPlayer() {
    const trimmedName = manualPlayerName.trim();

    if (!trimmedName) return;

    const nameAlreadyExists = manualPlayers.some(
      (playerName) => playerName.toLowerCase() === trimmedName.toLowerCase()
    );

    if (nameAlreadyExists) {
      return;
    }

    setManualPlayers((currentPlayers) => [...currentPlayers, trimmedName]);
    setManualPlayerName("");
    setError("");
  }

  function removeManualPlayer(playerNameToRemove: string) {
    setManualPlayers((currentPlayers) =>
      currentPlayers.filter((playerName) => playerName !== playerNameToRemove)
    );
  }

  async function startGame() {
    if (!currentPlayerId || !selectedGame) return;

    setError("");

    try {
      const response = await fetch(`${serverUrl}/rooms/${roomCode}/games/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          playerId: currentPlayerId,
          settings: {
            playMode,
            manualPlayers,
            numberOfImposters: Number(numberOfImposters),
            roundTimer: Number(roundTimer),
            wordCategory
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Could not start game.");
        return;
      }

      setRoom(data.room);
      router.push(`/room/${roomCode}/play/${selectedGame.slug}`);
    } catch {
      setError("Could not connect to the server.");
    }
  }

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-xl space-y-6">
          <h1 className="text-3xl font-bold">Setup Error</h1>
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
          <p>Loading setup...</p>
        </div>
      </main>
    );
  }

  if (!selectedGame || selectedGame.slug !== gameSlug) {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-xl space-y-6">
          <h1 className="text-3xl font-bold">Game Not Selected</h1>
          <p>This game is not currently selected for room {room.code}.</p>

          <Button onClick={goBackToRoom} variant="inverted" size="md">
            Back to Room
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm opacity-70">Room {room.code}</p>
          <h1 className="text-5xl font-bold">{selectedGame.name} Setup</h1>
          <p className="text-lg opacity-80">{selectedGame.description}</p>

          {selectedGame.slug === "imposter" && (
            <div className="rounded-2xl border p-5">
              <p className="text-sm uppercase tracking-[0.3em] opacity-60">
                How this round works
              </p>
              <p className="mt-3 opacity-80">
                Choose whether everyone joins with their own phone or one phone
                is passed around. When the host starts, one or more players will
                secretly become imposters. Everyone else gets the same secret word.
              </p>
            </div>
          )}
        </header>

        {selectedGame.slug === "imposter" && (
          <section className="rounded-2xl border p-6">
            <h2 className="text-2xl font-semibold">Play Mode</h2>
            <p className="mt-2 opacity-80">
              Choose whether everyone uses their own device or one phone is
              passed around the group.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => setPlayMode("multiplayer")}
                disabled={!currentPlayerIsHost}
                className={`rounded-2xl border p-4 text-left hover:bg-white/10 disabled:opacity-50 ${
                  playMode === "multiplayer" ? "bg-white/10" : ""
                }`}
              >
                <p className="font-semibold">Everyone joins</p>
                <p className="mt-1 text-sm opacity-70">
                  Each player uses their own phone and sees their own role.
                </p>
              </button>

              <button
                onClick={() => setPlayMode("single_device")}
                disabled={!currentPlayerIsHost}
                className={`rounded-2xl border p-4 text-left hover:bg-white/10 disabled:opacity-50 ${
                  playMode === "single_device" ? "bg-white/10" : ""
                }`}
              >
                <p className="font-semibold">Pass one phone around</p>
                <p className="mt-1 text-sm opacity-70">
                  Add player names, then pass this phone around to reveal roles.
                </p>
              </button>
            </div>
          </section>
        )}

        <section className="rounded-2xl border p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              {playMode === "single_device" ? "Pass-the-Phone Players" : "Players"}
            </h2>
            <p className="opacity-70">
              {activePlayerCount}/{selectedGame.minPlayers} minimum
            </p>
          </div>

          {playMode === "multiplayer" ? (
            <ul className="mt-4 space-y-2">
              {room.players.map((player) => (
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
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={manualPlayerName}
                  onChange={(event) => setManualPlayerName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addManualPlayer();
                    }
                  }}
                  disabled={!currentPlayerIsHost}
                  placeholder="Add another player name"
                  className="flex-1 rounded-lg border p-3 text-black disabled:opacity-50"
                />
                <Button
                  onClick={addManualPlayer}
                  disabled={!currentPlayerIsHost}
                  variant="secondary"
                  size="md"
                  showLeftIcon={false}
                >
                  Add Player
                </Button>
              </div>

              {manualPlayers.length === 0 ? (
                <p className="opacity-80">
                  Add at least 2 names. These players do not need to join from separate devices.
                </p>
              ) : (
                <ul className="space-y-2">
                  {manualPlayers.map((playerName) => (
                    <li
                      key={playerName}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <span>{playerName}</span>

                      {currentPlayerIsHost && (
                        <button
                          onClick={() => removeManualPlayer(playerName)}
                          className="text-sm opacity-70 hover:opacity-100"
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border p-6">
          <h2 className="text-2xl font-semibold">Game Options</h2>
          {selectedGame.slug === "imposter" && (
            <p className="mt-2 opacity-80">
              Choose how the round is played, how many imposters there are, the
              timer length, and the word category.
            </p>
          )}

          {selectedGame.slug === "imposter" ? (
            <div className="mt-4 space-y-4">
              <label className="block space-y-2">
                <span className="font-semibold">Number of Imposters</span>
                <select
                  value={numberOfImposters}
                  onChange={(event) => setNumberOfImposters(event.target.value)}
                  disabled={!currentPlayerIsHost}
                  className="w-full rounded-lg border p-3 text-black disabled:opacity-50"
                >
                  <option value="1">1</option>
                  {maxImposters >= 2 && <option value="2">2</option>}
                  {maxImposters >= 3 && <option value="3">3</option>}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="font-semibold">Round Timer</span>
                <select
                  value={roundTimer}
                  onChange={(event) => setRoundTimer(event.target.value)}
                  disabled={!currentPlayerIsHost}
                  className="w-full rounded-lg border p-3 text-black disabled:opacity-50"
                >
                  <option value="30">30 seconds</option>
                  <option value="60">60 seconds</option>
                  <option value="90">90 seconds</option>
                  <option value="120">120 seconds</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="font-semibold">Word Category</span>
                <select
                  value={wordCategory}
                  onChange={(event) => setWordCategory(event.target.value)}
                  disabled={!currentPlayerIsHost}
                  className="w-full rounded-lg border p-3 text-black disabled:opacity-50"
                >
                  <option value="random">Random</option>
                  <option value="movies">Movies</option>
                  <option value="places">Places</option>
                  <option value="objects">Objects</option>
                </select>
              </label>
            </div>
          ) : (
            <p className="mt-4 opacity-80">
              Setup options for {selectedGame.name} will be added later.
            </p>
          )}

          {!currentPlayerIsHost && (
            <p className="mt-4 text-sm opacity-70">
              Only the host can change setup options.
            </p>
          )}
        </section>

        <div className="flex flex-wrap gap-3">
          <Button onClick={goBackToRoom} variant="inverted" size="md">
            Back to Room
          </Button>

          {playMode === "single_device" && !hasEnoughPlayers && (
            <p className="self-center text-sm opacity-70">
              Add at least {selectedGame.minPlayers} names. They do not need separate devices.
            </p>
          )}
          {currentPlayerIsHost ? (
            <Button
              onClick={startGame}
              disabled={!hasEnoughPlayers}
              variant="tertiary"
              size="md"
            >
              Start {selectedGame.name}
            </Button>
          ) : (
            <p className="self-center text-sm opacity-70">
              Waiting for the host to start {selectedGame.name}.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}