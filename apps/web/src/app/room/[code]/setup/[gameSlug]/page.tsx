"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { BriefcaseBusiness, MapPin, Minus, Play, Plus, Shapes, Shuffle, Skull, Utensils } from "lucide-react";
import { Avatar } from "@/components/ui/AvatarPicker";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState, AppScreen } from "@/components/ui/GameUI";
import { BrandNav } from "@/features/lobby/components/BrandNav";
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
  const [roundTimer] = useState(90);
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
    <AppScreen tone="dark" className="overflow-hidden pb-4">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[25rem] flex-col">
        <div className="flex items-start justify-between gap-3">
          <BrandNav title="Imposter Game Rules" tone="dark" onBack={() => router.push(`/room/${roomCode}`)} />
          <Button onClick={() => router.push(`/room/${roomCode}`)} variant="inverted" size="md" showLeftIcon={false} rightIcon={<Skull size={17} />}>End Room</Button>
        </div>

        <section className="mt-8 space-y-2">
          <button type="button" className="flex h-[60px] w-full items-center rounded-[24px] bg-[var(--surface-primary-light)] px-5 text-left">
            <span className="flex-1 text-body-bold">Players</span>
            <span className="text-title-sm-bold">{room.players.length}</span>
            <span className="ml-3 text-title-sm-bold">→</span>
          </button>
          <div className="flex h-[60px] items-center rounded-[24px] bg-[var(--surface-primary-light)] px-5">
            <span className="flex-1 text-body-bold">Imposters</span>
            <button type="button" aria-label="Decrease imposters" onClick={() => setNumberOfImposters((value) => Math.max(1, value - 1))} disabled={numberOfImposters <= 1} className="grid size-10 place-items-center rounded-full bg-[var(--surface-primary)] disabled:opacity-30"><Minus size={19} /></button>
            <output className="w-12 text-center text-title-sm-bold">{numberOfImposters}</output>
            <button type="button" aria-label="Increase imposters" onClick={() => setNumberOfImposters((value) => Math.min(room.players.length - 1, value + 1))} disabled={numberOfImposters >= room.players.length - 1} className="grid size-10 place-items-center rounded-full bg-[var(--surface-primary)] disabled:opacity-30"><Plus size={19} /></button>
          </div>
          <label className="flex h-[60px] items-center rounded-[24px] bg-[var(--surface-primary-light)] px-5">
            <span className="flex-1 text-body-bold">Hint for Imposters</span>
            <input type="checkbox" checked={hintsEnabled} onChange={(event) => setHintsEnabled(event.target.checked)} className="peer sr-only" />
            <span className="relative h-10 w-[74px] rounded-full bg-[var(--surface-primary)] peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--surface-secondary)] after:absolute after:left-3 after:top-[17px] after:h-2 after:w-6 after:rounded-full after:bg-white/25 peer-checked:after:left-[38px] peer-checked:after:bg-[var(--surface-secondary)]" />
          </label>
        </section>

        <section className="mt-6">
          <h2 className="text-center text-body-regular">Game Pack</h2>
          <div className="-mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-[112px] pb-3 [scrollbar-width:none]">
            {[
              ["random", "Random", Shuffle],
              ["objects", "Things", Shapes],
              ["food", "Food", Utensils],
              ["places", "Places", MapPin],
              ["jobs", "Jobs", BriefcaseBusiness]
            ].map(([value, label, Icon]) => {
              const selected = wordCategory === value;
              return (
                <button key={String(value)} type="button" onClick={() => setWordCategory(String(value))} aria-pressed={selected} className={`flex h-[182px] w-[180px] shrink-0 snap-center flex-col items-center justify-center rounded-[40px] border-2 border-transparent ${selected ? "bg-[var(--surface-inverted)] text-[var(--text-inverted)]" : "bg-[var(--surface-primary-light)] text-[var(--text-primary)]"}`}>
                  <Icon size={62} strokeWidth={2.5} className={selected ? "text-[var(--surface-secondary)]" : ""} />
                  <span className="mt-4 text-headline-md-bold">{String(label)}</span>
                </button>
              );
            })}
          </div>
        </section>

        {error && <p role="alert" className="mt-3 rounded-[16px] bg-[var(--danger)] px-4 py-3 text-footnote-semibold text-white">{error}</p>}

        <div className="mt-auto">
          <div className="mx-auto mb-5 flex w-fit items-center rounded-full bg-[var(--surface-primary-light)] px-3 py-2">
            <div className="flex -space-x-2">{room.players.slice(0, 5).map((player) => <span key={player.id} className="grid size-7 place-items-center rounded-full border border-[var(--surface-primary-light)] bg-[var(--surface-primary)]"><Avatar avatarId={player.avatarId} size="sm" className="brightness-0 invert" /></span>)}</div>
            <span className="ml-2 text-caption-semibold">{room.players.length} Players</span>
          </div>
          <Button onClick={startGame} disabled={!enoughPlayers || isStarting} variant="tertiary" size="lg" showLeftIcon={false} rightIcon={<Play size={21} />} className="w-full">
            {isStarting ? "Starting..." : enoughPlayers ? "Start Game" : `Need ${selectedGame.minPlayers} Players`}
          </Button>
        </div>
      </div>
    </AppScreen>
  );
}
