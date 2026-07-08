"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { Play, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NumberSlider, ErrorState, LoadingState, AppScreen } from "@/components/ui/GameUI";
import { PlayerCard } from "@/components/ui/PlayerCard";
import { Tag, Toggle } from "@/components/ui/Controls";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { imposterCategories } from "@/features/imposter/data/words";
import type { Room } from "@/features/lobby/types/room";
import { serverUrl } from "@/lib/config";
import { clearRoomSession, getStoredSession } from "@/lib/session";

export default function GameSetupPage({ params }: { params: Promise<{ code: string; gameSlug: string }> }) {
  const router = useRouter();
  const { code, gameSlug } = use(params);
  const roomCode = code.toUpperCase();
  const [room, setRoom] = useState<Room | null>(null);
  const [currentPlayerId] = useState(() => getStoredSession().roomCode?.toUpperCase() === roomCode ? getStoredSession().playerId : null);
  const [numberOfImposters, setNumberOfImposters] = useState(1);
  const [roundTimer, setRoundTimer] = useState(90);
  const [wordCategory, setWordCategory] = useState("random");
  const [hintsEnabled, setHintsEnabled] = useState(true);
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  const currentPlayer = room?.players.find((player) => player.id === currentPlayerId);
  const isHost = Boolean(currentPlayer?.isHost);
  const selectedGame = room?.selectedGame;
  const enoughPlayers = Boolean(selectedGame && room && room.players.length >= selectedGame.minPlayers);

  useEffect(() => {
    if (!currentPlayerId) router.replace(`/room/${roomCode}`);
  }, [currentPlayerId, roomCode, router]);

  useEffect(() => {
    fetch(`${serverUrl}/rooms/${roomCode}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        setRoom(data.room);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load room."));

    const socket = io(serverUrl);
    socket.emit("room:subscribe", { roomCode });
    socket.on("room:state", setRoom);
    socket.on("game:started", (payload: { game: { slug: string } }) => router.push(`/room/${roomCode}/play/${payload.game.slug}`));
    socket.on("room:ended", () => {
      clearRoomSession();
      router.push("/");
    });
    return () => {
      socket.disconnect();
    };
  }, [roomCode, router]);

  async function startGame() {
    if (!currentPlayerId) return;
    setError("");
    setIsStarting(true);
    try {
      const response = await fetch(`${serverUrl}/rooms/${roomCode}/games/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: currentPlayerId,
          settings: {
            playMode: "multiplayer",
            numberOfImposters,
            roundTimer,
            wordCategory,
            hintsEnabled
          }
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      router.push(`/room/${roomCode}/play/${gameSlug}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start game.");
      setIsStarting(false);
    }
  }

  if (error && !room) {
    return <ErrorState title="Setup unavailable" message={error} action={<Button onClick={() => router.push(`/room/${roomCode}`)} variant="inverted" size="lg" className="w-full">Back to Room</Button>} />;
  }
  if (!room) return <LoadingState title="Loading game setup..." subtitle={`Room ${roomCode}`} />;
  if (!selectedGame || selectedGame.slug !== gameSlug) {
    return <ErrorState title="Game not selected" message="Return to the room and select this game first." action={<Button onClick={() => router.push(`/room/${roomCode}`)} variant="inverted" size="lg" className="w-full">Back to Room</Button>} />;
  }
  if (!isHost) {
    return <LoadingState title="Waiting for the Room Owner..." subtitle={`${selectedGame.name} setup is in progress`} />;
  }

  return (
    <AppScreen tone="light">
      <div className="mx-auto max-w-[42rem]">
        <BrandNav title="Imposter Game Rules" tone="light" onBack={() => router.push(`/room/${roomCode}`)} />
        <section className="mt-8 grid gap-8 md:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="flex items-end justify-between">
              <h2 className="text-title-sm-extrabold">Players</h2>
              <p className="text-footnote-semibold opacity-55">{room.players.length} Players</p>
            </div>
            <div className="mt-3 space-y-2">
              {room.players.map((player) => <PlayerCard key={player.id} player={player} isCurrentPlayer={player.id === currentPlayerId} />)}
            </div>
          </div>

          <div className="space-y-4">
            <NumberSlider label="Imposters" value={numberOfImposters} min={1} max={Math.max(1, room.players.length - 1)} onChange={setNumberOfImposters} />
            <NumberSlider label="Round time" value={roundTimer} min={30} max={300} suffix="s" onChange={setRoundTimer} />
            <Toggle label="Hint for Imposters" checked={hintsEnabled} onChange={setHintsEnabled} />
            <fieldset className="rounded-[24px] bg-[var(--surface-inverted-light)] p-5">
              <legend className="px-1 text-body-semibold">Game Pack</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {imposterCategories.map((category) => (
                  <Tag key={category} selected={wordCategory === category} onClick={() => setWordCategory(category)}>
                    <span className="capitalize">{category}</span>
                  </Tag>
                ))}
              </div>
            </fieldset>
            {error && <p role="alert" className="rounded-[var(--radius-md)] bg-[var(--danger)] px-4 py-3 text-footnote-semibold text-white">{error}</p>}
          </div>
        </section>

        <div className="sticky bottom-4 mt-8 grid grid-cols-[auto_1fr] gap-2 rounded-[28px] bg-[var(--surface-inverted)] p-2 shadow-lg">
          <Button onClick={() => router.push(`/room/${roomCode}`)} variant="primary-plus" size="lg" showLeftIcon={false} showRightIcon={false} aria-label="Cancel setup"><X /></Button>
          <Button onClick={startGame} disabled={!enoughPlayers || isStarting} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Play />}>
            {isStarting ? "Starting..." : enoughPlayers ? "Start Game" : `Need ${selectedGame.minPlayers} Players`}
          </Button>
        </div>
      </div>
    </AppScreen>
  );
}
