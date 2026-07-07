"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreateRoomView } from "@/features/lobby/components/CreateRoomView";
import { RoomCreatedView } from "@/features/lobby/components/RoomCreatedView";
import { getGameBySlug } from "@/features/lobby/data/games";
import type { Room } from "@/features/lobby/types/room";
import { createRoom, selectRoomGame } from "@/lib/rooms";
import { getFallbackPlayerName, saveRoomSession } from "@/lib/session";

export default function CreateRoomPage() {
  return (
    <Suspense>
      <CreateRoomContent />
    </Suspense>
  );
}

function CreateRoomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingGameSlug = searchParams.get("game") ?? "";
  const pendingGame = useMemo(
    () => (pendingGameSlug ? getGameBySlug(pendingGameSlug) : undefined),
    [pendingGameSlug]
  );

  const [roomName, setRoomName] = useState("");
  const [playerName, setPlayerName] = useState(() => getFallbackPlayerName());
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null);
  const [copyMessage, setCopyMessage] = useState("");

  async function handleCreateRoom() {
    setError("");
    setIsCreating(true);

    try {
      const data = await createRoom({
        playerName,
        roomName
      });

      saveRoomSession({
        playerId: data.player.id,
        playerName: data.player.name,
        roomCode: data.room.code
      });

      let nextRoom = data.room;

      if (pendingGame) {
        const selected = await selectRoomGame({
          roomCode: data.room.code,
          playerId: data.player.id,
          gameSlug: pendingGame.slug
        });
        nextRoom = selected.room;
      }

      setCreatedRoom(nextRoom);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create room.");
    } finally {
      setIsCreating(false);
    }
  }

  async function copyInviteLink() {
    if (!createdRoom) return;

    await navigator.clipboard.writeText(
      `${window.location.origin}/room/${createdRoom.code}`
    );
    setCopyMessage("Invite link copied.");
    window.setTimeout(() => setCopyMessage(""), 1500);
  }

  if (createdRoom) {
    return (
      <RoomCreatedView
        room={createdRoom}
        pendingGame={pendingGame}
        copyMessage={copyMessage}
        onCopyLink={copyInviteLink}
        onContinue={() => router.push(`/room/${createdRoom.code}`)}
      />
    );
  }

  return (
    <CreateRoomView
      roomName={roomName}
      playerName={playerName}
      pendingGame={pendingGame}
      error={error}
      isCreating={isCreating}
      onRoomNameChange={setRoomName}
      onPlayerNameChange={setPlayerName}
      onBack={() => router.back()}
      onCreateRoom={handleCreateRoom}
    />
  );
}
