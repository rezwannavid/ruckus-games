"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { Avatar } from "@/components/ui/AvatarPicker";
import { AppScreen, ErrorState, LoadingState } from "@/components/ui/GameUI";
import { Button } from "@/components/ui/Button";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { GameCard } from "@/features/lobby/components/GameCard";
import { games, playableGameSlugs } from "@/features/lobby/data/games";
import type { Room } from "@/features/lobby/types/room";
import { serverUrl } from "@/lib/config";
import { getStoredSession } from "@/lib/session";

export default function RoomGamesPage({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
  const { code } = use(params);
  const roomCode = code.toUpperCase();
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState("");
  const [currentPlayerId] = useState(() => getStoredSession().roomCode?.toUpperCase() === roomCode ? getStoredSession().playerId : null);
  const isHost = Boolean(room?.players.find((player) => player.id === currentPlayerId)?.isHost);

  useEffect(() => {
    fetch(`${serverUrl}/rooms/${roomCode}`).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setRoom(data.room);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load room."));
    const socket = io(serverUrl);
    socket.emit("room:subscribe", { roomCode });
    socket.on("room:state", setRoom);
    return () => { socket.disconnect(); };
  }, [roomCode]);

  async function chooseGame(gameSlug: string) {
    if (!currentPlayerId || !isHost || !playableGameSlugs.has(gameSlug)) return;
    setError("");
    try {
      const response = await fetch(`${serverUrl}/rooms/${roomCode}/games/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: currentPlayerId, gameSlug })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      router.push(`/room/${roomCode}/setup/${gameSlug}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not select game.");
    }
  }

  if (error && !room) return <ErrorState title="Game list unavailable" message={error} action={<Button onClick={() => router.push(`/room/${roomCode}`)} variant="inverted" size="lg" className="w-full">Back to Room</Button>} />;
  if (!room) return <LoadingState title="Loading Games..." subtitle={`Room ${roomCode}`} />;

  return (
    <AppScreen tone="dark" className="overflow-hidden pb-4">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <BrandNav title="Select a game" tone="dark" onBack={() => router.push(`/room/${roomCode}`)} />
        {!isHost && <p className="mx-auto mt-5 rounded-full bg-[var(--surface-primary-light)] px-4 py-2 text-footnote-semibold">Only the Room Owner can start a game</p>}
        {error && <p role="alert" className="mx-auto mt-5 rounded-[16px] bg-[var(--danger)] px-4 py-3 text-footnote-semibold text-white">{error}</p>}
        <section className="-mx-4 mt-8 flex snap-x gap-4 overflow-x-auto px-4 pb-5 [scrollbar-width:none] md:grid md:grid-cols-3 md:overflow-visible">
          {games.map((game) => (
            <GameCard
              key={game.slug}
              game={game}
              disabled={!isHost || !playableGameSlugs.has(game.slug) || room.players.length > game.maxPlayers}
              comingSoon={!playableGameSlugs.has(game.slug)}
              onClick={() => chooseGame(game.slug)}
              className="w-[269px] shrink-0 snap-start md:w-full"
            />
          ))}
        </section>
        <div className="mx-auto mt-auto flex w-fit items-center rounded-full bg-[var(--surface-primary-light)] px-3 py-2">
          <div className="flex -space-x-2">
            {room.players.slice(0, 6).map((player) => <span key={player.id} className="grid size-7 place-items-center rounded-full border border-[var(--surface-primary-light)] bg-[var(--surface-primary)]"><Avatar avatarId={player.avatarId} size="sm" className="brightness-0 invert" /></span>)}
          </div>
          <span className="ml-2 text-caption-semibold">{room.players.length} Players</span>
        </div>
      </div>
    </AppScreen>
  );
}
