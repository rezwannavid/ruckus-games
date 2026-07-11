"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { ArrowRight, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/ui/GameUI";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { CharacterSelectionScreen } from "@/features/lobby/components/CharacterSelectionScreen";
import { RoomLobbyView } from "@/features/lobby/components/RoomLobbyView";
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
  const [avatarId, setAvatarId] = useState<number | null>(null);
  const [inviteStep, setInviteStep] = useState<"landing" | "name" | "avatar" | "joining">("landing");
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

  useEffect(() => {
    const nextSocket = io(serverUrl);
    socketRef.current = nextSocket;

    nextSocket.emit("room:subscribe", {
      roomCode,
      playerId: currentPlayerId
    });

    nextSocket.on("room:state", (roomState: Room) => {
      setRoom(roomState);
      setError("");
      const gameParticipant = roomState.gameState?.players.find((player) => player.id === currentPlayerId);
      if (roomState.status === "in_game" && roomState.selectedGame?.slug && !["left", "kicked", "spectating"].includes(gameParticipant?.status ?? "active")) {
        router.push(`/room/${roomCode}/play/${roomState.selectedGame.slug}`);
      }
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

    nextSocket.on("room:removed", (payload: { playerId: string; message: string }) => {
      if (payload.playerId !== currentPlayerId) return;
      clearRoomSession();
      setCurrentPlayerId(null);
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
  }, [currentPlayerId, roomCode, router]);

  async function joinRoom() {
    if (avatarId === null || !playerName.trim()) return;
    setInviteStep("joining");
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
        roomCode: data.room.code,
        playerId: data.player.id
      });
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setIsJoining(false);
      if (!currentPlayerId) setInviteStep("avatar");
    }
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

  async function removePlayer(playerId: string) {
    if (!currentPlayerId || !currentPlayerIsHost) return;
    setError("");
    try {
      const response = await fetch(`${serverUrl}/rooms/${roomCode}/players/${playerId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: currentPlayerId })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "Could not remove player.");
      setRoom(data.room);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not remove player.");
    }
  }

  function continueToSetup() {
    router.push(`/room/${roomCode}/games`);
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
    const host = room.players.find((player) => player.isHost);

    if (inviteStep === "joining") {
      return <LoadingState title="Joining Room..." subtitle={`as ${playerName}`} />;
    }

    if (inviteStep === "avatar") {
      return (
        <CharacterSelectionScreen
          value={avatarId}
          onChange={setAvatarId}
          onBack={() => setInviteStep("name")}
          onContinue={joinRoom}
          actionLabel={isJoining ? "Joining..." : "Join Room"}
          actionIcon={<LogIn />}
          error={error}
          eyebrow={room.name}
        />
      );
    }

    if (inviteStep === "name") {
      const hasName = Boolean(playerName.trim());
      return (
        <main className="min-screen-safe overflow-hidden bg-[var(--surface-secondary)] text-[var(--text-inverted-plus)] [--page-background:var(--surface-secondary)]">
          <div className="mx-auto flex min-screen-safe w-full max-w-[393px] flex-col px-4 pb-safe pt-safe">
            <BrandNav title="Enter your Name" tone="light" onBack={() => setInviteStep("landing")} />
            <label className="flex flex-1 items-center justify-center">
              <span className="sr-only">Your name</span>
              <input
                autoFocus
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value.slice(0, 16))}
                onKeyDown={(event) => { if (event.key === "Enter" && hasName) setInviteStep("avatar"); }}
                autoComplete="nickname"
                className="h-24 w-full border-0 border-b-4 border-black/20 bg-transparent px-2 text-center !text-[56px] font-extrabold leading-none caret-white outline-none focus:border-[var(--surface-inverted-light)]"
              />
            </label>
            {error && <p role="alert" className="mb-3 rounded-[18px] bg-[var(--surface-primary)] px-4 py-3 text-footnote-semibold text-[var(--text-primary)]">{error}</p>}
            <Button onClick={() => setInviteStep("avatar")} disabled={!hasName} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<ArrowRight />} className="w-full">Enter</Button>
          </div>
        </main>
      );
    }

    return (
      <main className="min-screen-safe bg-[var(--surface-secondary)] text-[var(--text-inverted-plus)] [--page-background:var(--surface-secondary)]">
        <div className="mx-auto flex min-screen-safe w-full max-w-[393px] flex-col px-4 pb-safe pt-safe text-center">
          <BrandNav tone="light" onBack={goHome} />
          <section className="my-auto animate-spring-in">
            <p className="text-title-sm-semibold">You have been invited to</p>
            <h1 className="mt-3 text-title-lg-bold text-balance">{room.name ?? `${host?.name ?? "Your friend"}'s Room`}</h1>
            <p className="mt-4 text-body-semibold opacity-65">Hosted by {host?.name ?? "the room owner"}</p>
            <div className="mx-auto mt-7 w-fit rounded-full bg-[var(--surface-primary)] px-5 py-2 text-footnote-semibold text-[var(--text-primary)]">Room {room.code}</div>
          </section>
          <Button onClick={() => setInviteStep("name")} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<ArrowRight />} className="w-full">Continue</Button>
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
      copyMessage={error || copyMessage}
      onBack={goHome}
      onCopyLink={copyInviteLink}
      onEndRoom={leaveRoom}
      onContinueSetup={continueToSetup}
      onRemovePlayer={removePlayer}
    />
  );
}
