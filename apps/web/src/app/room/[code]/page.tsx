"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";

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

const games: Game[] = [
  {
    slug: "imposter",
    name: "Imposter",
    description: "Find the hidden player before they blend in.",
    minPlayers: 2,
    maxPlayers: 12
  },
  {
    slug: "codenames",
    name: "Codenames",
    description: "Give clues and guess the right words with your team.",
    minPlayers: 4,
    maxPlayers: 10
  },
  {
    slug: "name-3",
    name: "Name 3",
    description: "Name three things before time runs out.",
    minPlayers: 3,
    maxPlayers: 12
  },
  {
    slug: "passwords",
    name: "Passwords",
    description: "Guess the secret word from clever clues.",
    minPlayers: 4,
    maxPlayers: 10
  },
  {
    slug: "fibbage",
    name: "Fibbage",
    description: "Make up convincing lies and spot the truth.",
    minPlayers: 3,
    maxPlayers: 8
  },
  {
    slug: "wavelength",
    name: "Wavelength",
    description: "Read the room and guess where the answer lands.",
    minPlayers: 2,
    maxPlayers: 12
  }
];

export default function RoomPage({
  params
}: {
  params: Promise<{ code: string }>;
}) {
  const router = useRouter();
  const { code } = use(params);

  const roomCode = code.toUpperCase();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const inviteLink = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/room/${roomCode}`;
  }, [roomCode]);

  const currentPlayer = room?.players.find(
    (player) => player.id === currentPlayerId
  );

  const hasJoinedRoom = Boolean(currentPlayer);
  const currentPlayerIsHost = Boolean(currentPlayer?.isHost);
  const selectedGame = room?.selectedGame;
  const canSetupSelectedGame = Boolean(selectedGame);
  const playersNeeded = selectedGame
    ? Math.max(selectedGame.minPlayers - (room?.players.length ?? 0), 0)
    : 0;
  const hasEnoughPlayers = selectedGame ? playersNeeded === 0 : false;

  useEffect(() => {
    const savedRoomCode = localStorage.getItem("ruckusRoomCode");
    const savedPlayerId = localStorage.getItem("ruckusPlayerId");
    const savedPlayerName = localStorage.getItem("ruckusPlayerName");

    if (savedRoomCode?.toUpperCase() === roomCode && savedPlayerId) {
      setCurrentPlayerId(savedPlayerId);
    }

    if (savedPlayerName) {
      setPlayerName(savedPlayerName);
    }
  }, [roomCode]);

  useEffect(() => {
    const nextSocket = io(serverUrl);

    nextSocket.emit("room:subscribe", {
      roomCode
    });

    nextSocket.on("room:state", (roomState: Room) => {
      setRoom(roomState);
      setError("");
    });

    nextSocket.on("room:error", (err: { message: string }) => {
      setError(err.message);
    });

    nextSocket.on("room:ended", (payload: { message: string }) => {
      localStorage.removeItem("ruckusPlayerId");
      localStorage.removeItem("ruckusPlayerName");
      localStorage.removeItem("ruckusRoomCode");

      setCurrentPlayerId(null);
      setRoom(null);
      setError(payload.message);

      router.push("/");
    });

    nextSocket.on("game:started", (payload: { game: Game }) => {
      router.push(`/room/${roomCode}/play/${payload.game.slug}`);
    });

    setSocket(nextSocket);

    return () => {
      nextSocket.disconnect();
    };
  }, [roomCode, router]);

  async function joinRoom() {
    setError("");
    setIsJoining(true);

    try {
      const response = await fetch(`${serverUrl}/rooms/${roomCode}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          playerName
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Could not join room.");
        return;
      }

      localStorage.setItem("ruckusPlayerId", data.player.id);
      localStorage.setItem("ruckusPlayerName", data.player.name);
      localStorage.setItem("ruckusRoomCode", data.room.code);

      setCurrentPlayerId(data.player.id);
      setRoom(data.room);

      socket?.emit("room:subscribe", {
        roomCode: data.room.code
      });
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setIsJoining(false);
    }
  }

  async function copyRoomCode() {
    await navigator.clipboard.writeText(roomCode);
    setCopyMessage("Room code copied.");
    setTimeout(() => setCopyMessage(""), 1500);
  }

  async function copyInviteLink() {
    await navigator.clipboard.writeText(inviteLink);
    setCopyMessage("Invite link copied.");
    setTimeout(() => setCopyMessage(""), 1500);
  }

  async function leaveRoom() {
    if (!currentPlayerId) {
      router.push("/");
      return;
    }

    setError("");

    try {
      const response = await fetch(`${serverUrl}/rooms/${roomCode}/leave`, {
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
        setError(data.message ?? "Could not leave room.");
        return;
      }

      localStorage.removeItem("ruckusPlayerId");
      localStorage.removeItem("ruckusPlayerName");
      localStorage.removeItem("ruckusRoomCode");

      setCurrentPlayerId(null);
      setRoom(null);

      router.push("/");
    } catch {
      setError("Could not connect to the server.");
    }
  }

  async function selectGame(gameSlug: string) {
    if (!currentPlayerId) return;

    setError("");

    try {
      const response = await fetch(`${serverUrl}/rooms/${roomCode}/games/select`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          playerId: currentPlayerId,
          gameSlug
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? "Could not select game.");
        return;
      }

      setRoom(data.room);
    } catch {
      setError("Could not connect to the server.");
    }
  }

  function goToGameSetup() {
    if (!selectedGame) return;

    router.push(`/room/${roomCode}/setup/${selectedGame.slug}`);
  }

  function goHome() {
    router.push("/");
  }

  if (error && !room) {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-xl space-y-6">
          <h1 className="text-3xl font-bold">Room Error</h1>
          <p>{error}</p>

          <button
            onClick={goHome}
            className="rounded-lg border px-4 py-2 font-semibold hover:bg-white/10"
          >
            Back Home
          </button>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-xl">
          <p>Loading room...</p>
        </div>
      </main>
    );
  }

  if (!hasJoinedRoom) {
    return (
      <main className="min-h-screen p-8">
        <div className="mx-auto max-w-xl space-y-8">
          <header className="space-y-3">
            <p className="text-sm opacity-70">You were invited to room</p>
            <h1 className="text-5xl font-bold tracking-wide">{room.code}</h1>
            <p className="text-lg opacity-80">
              Enter your name to join this Ruckus Games room.
            </p>
          </header>

          <section className="space-y-4 rounded-2xl border p-6">
            <label className="block space-y-2">
              <span className="font-semibold">Your Name</span>
              <input
                className="w-full rounded-lg border p-3 text-black"
                placeholder="Enter your name"
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    joinRoom();
                  }
                }}
              />
            </label>

            <button
              onClick={joinRoom}
              disabled={isJoining}
              className="w-full rounded-lg border p-3 font-semibold hover:bg-white/10 disabled:opacity-50"
            >
              {isJoining ? "Joining..." : "Join Room"}
            </button>

            {error && <p className="text-red-500">{error}</p>}
          </section>

          <section className="rounded-2xl border p-6">
            <p className="text-sm opacity-70">Room Code</p>
            <div className="mt-2 flex items-center justify-between gap-4">
              <p className="text-2xl font-bold">{room.code}</p>

              <button
                onClick={copyRoomCode}
                className="rounded-lg border px-4 py-2 font-semibold hover:bg-white/10"
              >
                Copy Code
              </button>
            </div>
          </section>

          {copyMessage && <p className="text-sm opacity-70">{copyMessage}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-4">
          <div>
            <p className="text-sm opacity-70">Room Code</p>
            <h1 className="text-5xl font-bold tracking-wide">{room.code}</h1>
            <p className="mt-2 opacity-80">
              You are playing as{" "}
              <span className="font-semibold">{currentPlayer?.name}</span>.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={copyRoomCode}
              className="rounded-lg border px-4 py-2 font-semibold hover:bg-white/10"
            >
              Copy Room Code
            </button>

            <button
              onClick={copyInviteLink}
              className="rounded-lg border px-4 py-2 font-semibold hover:bg-white/10"
            >
              Copy Invite Link
            </button>

            <button
              onClick={leaveRoom}
              className="rounded-lg border px-4 py-2 font-semibold hover:bg-white/10"
            >
              Leave Room
            </button>
          </div>

          {copyMessage && <p className="text-sm opacity-70">{copyMessage}</p>}
        </header>

        {selectedGame && (
          <section className="rounded-2xl border p-6">
            <p className="text-sm opacity-70">Selected Game</p>
            <h2 className="mt-1 text-3xl font-bold">{selectedGame.name}</h2>
            <p className="mt-2 opacity-80">{selectedGame.description}</p>

            <div className="mt-4 rounded-xl border p-4">
              <p>
                Connected players: {room.players.length}/{selectedGame.minPlayers} for everyone-joins mode
              </p>

              {selectedGame.slug === "imposter" ? (
                <p className="mt-2 opacity-80">
                  Continue to setup to choose everyone-joins mode or pass one phone around.
                </p>
              ) : hasEnoughPlayers ? (
                <p className="mt-2 opacity-80">
                  Ready to play. The host can continue to setup or choose another game.
                </p>
              ) : (
                <p className="mt-2 opacity-80">
                  Need {playersNeeded} more player{playersNeeded === 1 ? "" : "s"} to start.
                </p>
              )}
            </div>

            {currentPlayerIsHost ? (
              <button
                onClick={goToGameSetup}
                disabled={!canSetupSelectedGame}
                className="mt-4 rounded-lg border px-4 py-2 font-semibold hover:bg-white/10 disabled:opacity-50"
              >
                {room.status === "waiting" ? "Play / Setup" : "Continue"}
              </button>
            ) : (
              <p className="mt-4 text-sm opacity-70">
                Waiting for the host to start the next round.
              </p>
            )}
          </section>
        )}

        <section className="rounded-2xl border p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Players</h2>
            <p className="opacity-70">{room.players.length} joined</p>
          </div>

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
        </section>

        <section className="rounded-2xl border p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Games</h2>
              {!currentPlayerIsHost && (
                <p className="mt-1 text-sm opacity-70">
                  Only the host can select a game.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {games.map((game) => {
              const isSelected = selectedGame?.slug === game.slug;
              const tooManyPlayers = room.players.length > game.maxPlayers;
              const isDisabled = !currentPlayerIsHost || tooManyPlayers;

              return (
                <button
                  key={game.slug}
                  onClick={() => selectGame(game.slug)}
                  disabled={isDisabled}
                  className="rounded-xl border p-4 text-left hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold">{game.name}</h3>
                    {isSelected && (
                      <span className="rounded-full border px-2 py-1 text-xs">
                        Selected
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm opacity-70">{game.description}</p>
                  <p className="mt-3 text-sm opacity-70">
                    {game.minPlayers}–{game.maxPlayers} players
                  </p>

                  {tooManyPlayers && (
                    <p className="mt-2 text-sm">
                      Too many players for this game.
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {error && <p className="mt-4 text-red-500">{error}</p>}
        </section>
      </div>
    </main>
  );
}