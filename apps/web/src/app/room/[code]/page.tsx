"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/components/ui/Button";
import { AvatarPicker } from "@/components/ui/AvatarPicker";
import { FormField } from "@/components/ui/FormField";
import { RoomLobbyView } from "@/features/lobby/components/RoomLobbyView";
import { games } from "@/features/lobby/data/games";
import type { Game, Room } from "@/features/lobby/types/room";
import { serverUrl } from "@/lib/config";
import { joinRoom as joinExistingRoom } from "@/lib/rooms";
import { clearRoomSession, getStoredSession, saveRoomSession } from "@/lib/session";

export default function RoomPage({
  params
}: {
  params: Promise<{ code: string }>;
}) {
  const router = useRouter();
  const { code } = use(params);

  const roomCode = code.toUpperCase();

  const socketRef = useRef<Socket | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [playerName, setPlayerName] = useState(() => {
    if (typeof window === "undefined") return "";
    return getStoredSession().playerName ?? "";
  });
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;

    const savedSession = getStoredSession();
    return savedSession.roomCode?.toUpperCase() === roomCode
      ? savedSession.playerId
      : null;
  });
  const [avatarId, setAvatarId] = useState(() => {
    if (typeof window === "undefined") return 1;
    return getStoredSession().avatarId;
  });
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

  useEffect(() => {
    const nextSocket = io(serverUrl);
    socketRef.current = nextSocket;

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
      clearRoomSession();

      setCurrentPlayerId(null);
      setRoom(null);
      setError(payload.message);

      router.push("/");
    });

    nextSocket.on("game:started", (payload: { game: Game }) => {
      router.push(`/room/${roomCode}/play/${payload.game.slug}`);
    });

    return () => {
      socketRef.current = null;
      nextSocket.disconnect();
    };
  }, [roomCode, router]);

  async function joinRoom() {
    setError("");
    setIsJoining(true);

    try {
      const data = await joinExistingRoom({
        roomCode,
        playerName,
        avatarId
      });

      saveRoomSession({
        playerId: data.player.id,
        playerName: data.player.name,
        roomCode: data.room.code,
        avatarId: data.player.avatarId
      });

      setCurrentPlayerId(data.player.id);
      setRoom(data.room);

      socketRef.current?.emit("room:subscribe", {
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

      clearRoomSession();

      setCurrentPlayerId(null);
      setRoom(null);

      router.push("/");
    } catch {
      setError("Could not connect to the server.");
    }
  }

  async function selectGame(gameSlug: string) {
    if (!currentPlayerId) return false;

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
        return false;
      }

      setRoom(data.room);
      return true;
    } catch {
      setError("Could not connect to the server.");
      return false;
    }
  }

  function goToGameSetup() {
    if (!selectedGame) return;

    router.push(`/room/${roomCode}/setup/${selectedGame.slug}`);
  }

  async function chooseGame(gameSlug: string) {
    if (!currentPlayerIsHost) {
      setError("Only the room owner can choose a game.");
      return;
    }

    if (gameSlug !== "imposter") {
      setError("That game is coming soon.");
      return;
    }

    await selectGame(gameSlug);
  }

  async function continueToSetup() {
    if (!currentPlayerIsHost) {
      setError("Only the room owner can start setup.");
      return;
    }

    if (selectedGame) {
      goToGameSetup();
      return;
    }

    const didSelectGame = await selectGame("imposter");

    if (didSelectGame) {
      router.push(`/room/${roomCode}/setup/imposter`);
    }
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

          <Button onClick={goHome} variant="inverted" size="md">
            Back Home
          </Button>
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
      <main className="min-h-screen bg-[var(--surface-secondary)] p-4 pt-10 text-[var(--text-inverted-plus)]">
        <div className="mx-auto max-w-[25rem] space-y-8">
          <header className="space-y-3">
            <p className="text-footnote-semibold opacity-70">You were invited to</p>
            <h1 className="text-display-lg-bold">{room.name}</h1>
            <p className="text-body-medium opacity-80">
              Enter your name to join this Ruckus Games room.
            </p>
          </header>

          <section className="space-y-5">
            <FormField label="Your name" name="invitePlayerName" placeholder="Enter your name" value={playerName} onChange={(event) => setPlayerName(event.target.value)} />
            <AvatarPicker value={avatarId} onChange={setAvatarId} />

            <Button
              onClick={joinRoom}
              disabled={isJoining}
              variant="inverted"
              size="lg"
              className="w-full"
            >
              {isJoining ? "Joining..." : "Join Room"}
            </Button>

            {error && <p className="text-red-500">{error}</p>}
          </section>

          <section className="rounded-[24px] bg-[var(--surface-inverted-light)] p-6">
            <p className="text-footnote-semibold opacity-70">Room Code</p>
            <div className="mt-2 flex items-center justify-between gap-4">
              <p className="text-title-md-extrabold">{room.code}</p>

              <Button onClick={copyRoomCode} variant="inverted" size="md">
                Copy Code
              </Button>
            </div>
          </section>

          {copyMessage && <p className="text-sm opacity-70">{copyMessage}</p>}
        </div>
      </main>
    );
  }

  return (
    <RoomLobbyView
      roomName={room.name}
      roomCode={room.code}
      players={room.players}
      currentPlayerId={currentPlayerId}
      isHost={currentPlayerIsHost}
      games={games}
      selectedGame={selectedGame}
      copyMessage={error || copyMessage}
      onBack={goHome}
      onCopyLink={copyInviteLink}
      onEndRoom={leaveRoom}
      onSelectGame={chooseGame}
      onContinueSetup={continueToSetup}
    />
  );
}
