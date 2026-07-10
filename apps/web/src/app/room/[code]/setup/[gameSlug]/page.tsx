"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import type { LucideIcon } from "lucide-react";
import { Building2, Coffee, Film, Laugh, MapPin, Minus, Play, Plus, Shuffle, Skull, Sparkles, UsersRound } from "lucide-react";
import { Avatar } from "@/components/ui/AvatarPicker";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState, AppScreen } from "@/components/ui/GameUI";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { GameArtwork } from "@/features/lobby/components/GameArtwork";
import type { Room } from "@/features/lobby/types/room";
import { serverUrl } from "@/lib/config";
import { clearRoomSession, getStoredSession } from "@/lib/session";

const timerOptions = [
  ["none", "No Timer"],
  [30, "30s"],
  [60, "1m"],
  [90, "1m 30s"],
  [120, "2m"],
  [180, "3m"]
] as const;

type PackOption = {
  id: string;
  label: string;
  Icon: LucideIcon;
  subcategories: Array<{ id: string; label: string }>;
};

const imposterPacks: PackOption[] = [
  { id: "classic", label: "Classic", Icon: Sparkles, subcategories: [
    { id: "objects", label: "Things" },
    { id: "places", label: "Places" },
    { id: "food", label: "Food" },
    { id: "animals", label: "Animals" },
    { id: "actions", label: "Actions" },
    { id: "social", label: "Social" }
  ] },
  { id: "desi", label: "Desi", Icon: MapPin, subcategories: [
    { id: "dhaka", label: "Dhaka" },
    { id: "food", label: "Bangladeshi Food" },
    { id: "eid", label: "Eid" },
    { id: "school", label: "School" },
    { id: "family", label: "Family" },
    { id: "cricket", label: "Cricket" }
  ] }
];

const imposterCodePacks: PackOption[] = [
  { id: "casual", label: "Casual", Icon: Laugh, subcategories: [
    { id: "objects", label: "Objects" },
    { id: "internet", label: "Internet" },
    { id: "funny", label: "Funny" }
  ] },
  { id: "life", label: "Life", Icon: UsersRound, subcategories: [
    { id: "food", label: "Food" },
    { id: "school", label: "School" },
    { id: "work", label: "Work" },
    { id: "relationships", label: "Friends" }
  ] },
  { id: "desi", label: "Desi", Icon: Coffee, subcategories: [
    { id: "food", label: "Food" },
    { id: "dhaka", label: "Dhaka" },
    { id: "eid", label: "Eid" },
    { id: "family", label: "Family" }
  ] }
];

const wavelengthPacks: PackOption[] = [
  { id: "casual", label: "Casual", Icon: Shuffle, subcategories: [
    { id: "simple", label: "Simple" },
    { id: "people", label: "People" },
    { id: "weird", label: "Weird" }
  ] },
  { id: "culture", label: "Culture", Icon: Film, subcategories: [
    { id: "food", label: "Food" },
    { id: "movies", label: "Movies" },
    { id: "music", label: "Music" }
  ] },
  { id: "desi", label: "Desi", Icon: Building2, subcategories: [
    { id: "dhaka", label: "Dhaka" },
    { id: "food", label: "Food" },
    { id: "social", label: "Social" },
    { id: "student", label: "Student" }
  ] }
];

function PackPicker({
  packs,
  value,
  onChange
}: {
  packs: PackOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const selectedPackId = value.split(":")[0];
  const selectedPack = packs.find((pack) => pack.id === selectedPackId) ?? packs[0];
  const SelectedIcon = selectedPack.Icon;

  return (
    <section className="mt-6 pb-4">
      <h2 className="text-center text-body-regular">Game Pack</h2>
      <div className="-mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 [scrollbar-width:none]">
        {packs.map(({ id, label, Icon }) => {
          const selected = selectedPackId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-pressed={value === id}
              className={`interactive-pop group flex h-[158px] w-[150px] shrink-0 snap-start flex-col items-center justify-center rounded-[36px] border-[4px] bg-[var(--surface-primary-light)] text-center text-[var(--text-primary)] ${selected ? "border-[var(--color-game-accent)]" : "border-transparent"}`}
            >
              <Icon size={54} strokeWidth={2.4} className="text-[var(--color-game-accent)] transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110" />
              <span className="mt-4 text-headline-md-bold">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="animate-pop rounded-[28px] bg-[var(--surface-primary-light)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-body-bold">{selectedPack.label}</p>
            <p className="text-caption-regular opacity-60">Choose full pack or one subcategory</p>
          </div>
          <SelectedIcon className="shrink-0 text-[var(--surface-secondary)]" size={28} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onChange(selectedPack.id)}
            aria-pressed={value === selectedPack.id}
            className="rounded-full bg-[var(--surface-primary)] px-4 py-2 text-footnote-semibold transition hover:-translate-y-0.5 active:scale-95 aria-pressed:bg-[var(--surface-secondary)] aria-pressed:text-[var(--text-inverted-plus)]"
          >
            Full {selectedPack.label}
          </button>
          {selectedPack.subcategories.map((subcategory) => {
            const subcategoryValue = `${selectedPack.id}:${subcategory.id}`;
            return (
              <button
                key={subcategoryValue}
                type="button"
                onClick={() => onChange(subcategoryValue)}
                aria-pressed={value === subcategoryValue}
                className="rounded-full bg-[var(--surface-primary)] px-4 py-2 text-footnote-semibold transition hover:-translate-y-0.5 active:scale-95 aria-pressed:bg-[var(--surface-secondary)] aria-pressed:text-[var(--text-inverted-plus)]"
              >
                {subcategory.label}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function GameSetupPage({ params }: { params: Promise<{ code: string; gameSlug: string }> }) {
  const router = useRouter();
  const { code, gameSlug } = use(params);
  const roomCode = code.toUpperCase();
  const [room, setRoom] = useState<Room | null>(null);
  const [currentPlayerId] = useState(() => getStoredSession().roomCode?.toUpperCase() === roomCode ? getStoredSession().playerId : null);
  const [numberOfImposters, setNumberOfImposters] = useState(1);
  const [timerSetting, setTimerSetting] = useState<(typeof timerOptions)[number][0]>(90);
  const [wordCategory, setWordCategory] = useState("classic");
  const [questionPack, setQuestionPack] = useState("casual");
  const [scalePack, setScalePack] = useState("casual");
  const [wavelengthMode, setWavelengthMode] = useState<"single" | "teams">("single");
  const [maxRounds, setMaxRounds] = useState(6);
  const [hintsEnabled, setHintsEnabled] = useState(true);
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  const currentPlayer = room?.players.find((player) => player.id === currentPlayerId);
  const isHost = Boolean(currentPlayer?.isHost);
  const selectedGame = room?.selectedGame;
  const enoughPlayers = Boolean(
    selectedGame &&
    room &&
    room.players.length >= selectedGame.minPlayers &&
    !(selectedGame.slug === "wavelength" && wavelengthMode === "teams" && room.players.length < 4)
  );
  const isImposterSetup = selectedGame?.slug === "imposter";
  const isImposterFamily = selectedGame?.slug === "imposter" || selectedGame?.slug === "imposter-code";
  const maxImposters = Math.max(1, (room?.players.length ?? 2) - 1);

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
    socket.emit("room:subscribe", { roomCode, playerId: currentPlayerId });
    socket.on("room:state", setRoom);
    socket.on("game:started", (payload: { game: { slug: string } }) => router.push(`/room/${roomCode}/play/${payload.game.slug}`));
    socket.on("room:ended", () => {
      clearRoomSession();
      router.push("/");
    });
    return () => {
      socket.disconnect();
    };
  }, [currentPlayerId, roomCode, router]);

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
            roundTimer: timerSetting,
            wordCategory,
            questionPack,
            scalePack,
            wavelengthMode,
            maxRounds,
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
      <div className="mx-auto flex min-h-[calc(100dvh-3rem-var(--safe-bottom)-var(--safe-top))] max-w-[25rem] flex-col">
        <div className="flex items-start justify-between gap-3">
          <BrandNav title={`${selectedGame.name} Setup`} tone="dark" onBack={() => router.push(`/room/${roomCode}`)} />
          <Button onClick={() => router.push(`/room/${roomCode}`)} variant="inverted" size="md" showLeftIcon={false} rightIcon={<Skull size={17} />}>End Room</Button>
        </div>

        <section className="mt-8 space-y-2">
          <button type="button" className="flex h-[60px] w-full items-center rounded-[24px] bg-[var(--surface-primary-light)] px-5 text-left">
            <span className="flex-1 text-body-bold">Players</span>
            <span className="text-title-sm-bold">{room.players.length}</span>
            <span className="ml-3 text-title-sm-bold">→</span>
          </button>
          {isImposterFamily ? (
            <>
              <div className="flex h-[60px] items-center rounded-[24px] bg-[var(--surface-primary-light)] px-5">
                <span className="flex-1 text-body-bold">Imposter{numberOfImposters === 1 ? "" : "s"}</span>
                <button type="button" aria-label="Decrease imposters" onClick={() => setNumberOfImposters((value) => Math.max(1, value - 1))} disabled={numberOfImposters <= 1} className="grid size-10 place-items-center rounded-full bg-[var(--surface-primary)] disabled:opacity-30"><Minus size={19} /></button>
                <output className="w-12 text-center text-title-sm-bold">{numberOfImposters}</output>
                <button type="button" aria-label="Increase imposters" onClick={() => setNumberOfImposters((value) => Math.min(maxImposters, value + 1))} disabled={numberOfImposters >= maxImposters} className="grid size-10 place-items-center rounded-full bg-[var(--surface-primary)] disabled:opacity-30"><Plus size={19} /></button>
              </div>
              {isImposterSetup && (
                <label className="flex h-[60px] items-center rounded-[24px] bg-[var(--surface-primary-light)] px-5">
                  <span className="flex-1 text-body-bold">Hint for Imposters</span>
                  <input type="checkbox" checked={hintsEnabled} onChange={(event) => setHintsEnabled(event.target.checked)} className="peer sr-only" />
                  <span className="relative h-10 w-[74px] rounded-full bg-[var(--surface-primary)] peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--surface-secondary)] after:absolute after:left-3 after:top-[17px] after:h-2 after:w-6 after:rounded-full after:bg-white/25 peer-checked:after:left-[38px] peer-checked:after:bg-[var(--surface-secondary)]" />
                </label>
              )}
            </>
          ) : (
            <div className="rounded-[32px] bg-[var(--surface-primary-light)] p-6 text-center">
              <div className="mx-auto w-24"><GameArtwork gameSlug={selectedGame.slug} tone="light" /></div>
              <h2 className="mt-4 text-title-sm-bold">{selectedGame.name}</h2>
              <p className="mt-2 text-body-medium opacity-70">
                {selectedGame.slug === "imposter-code"
                  ? "Players privately answer prompts, reveal every answer together, then vote for the odd response."
                  : "One clue-giver sees a secret number, gives a clue, and the room lands a guess on the scale."}
              </p>
            </div>
          )}
        </section>

        <section className="mt-5 space-y-3">
          <h2 className="text-center text-body-regular">Timer</h2>
          <div className="grid grid-cols-3 gap-2">
            {timerOptions.map(([value, label]) => (
              <button
                key={String(value)}
                type="button"
                onClick={() => setTimerSetting(value)}
                aria-pressed={timerSetting === value}
                className="h-12 rounded-[18px] bg-[var(--surface-primary-light)] text-footnote-semibold transition aria-pressed:bg-[var(--surface-secondary)] aria-pressed:text-[var(--text-inverted-plus)]"
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {selectedGame.slug === "wavelength" && (
          <section className="mt-5 space-y-3">
            <h2 className="text-center text-body-regular">Wavelength Mode</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["single", "Single"],
                ["teams", "Team Mode"]
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setWavelengthMode(value as "single" | "teams")}
                  aria-pressed={wavelengthMode === value}
                  className="min-h-14 rounded-[20px] bg-[var(--surface-primary-light)] px-3 text-footnote-semibold transition aria-pressed:bg-[var(--surface-secondary)] aria-pressed:text-[var(--text-inverted-plus)] disabled:opacity-30"
                  disabled={value === "teams" && room.players.length < 4}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex h-[60px] items-center rounded-[24px] bg-[var(--surface-primary-light)] px-5">
              <span className="flex-1 text-body-bold">Rounds</span>
              <button type="button" aria-label="Decrease rounds" onClick={() => setMaxRounds((value) => Math.max(1, value - 1))} className="grid size-10 place-items-center rounded-full bg-[var(--surface-primary)]"><Minus size={19} /></button>
              <output className="w-12 text-center text-title-sm-bold">{maxRounds}</output>
              <button type="button" aria-label="Increase rounds" onClick={() => setMaxRounds((value) => Math.min(20, value + 1))} className="grid size-10 place-items-center rounded-full bg-[var(--surface-primary)]"><Plus size={19} /></button>
            </div>
            {wavelengthMode === "teams" && room.players.length < 4 && (
              <p className="text-center text-footnote-semibold text-[var(--text-highlight)]">Team Mode needs at least 4 players.</p>
            )}
          </section>
        )}

        {selectedGame.slug === "imposter" ? (
          <PackPicker packs={imposterPacks} value={wordCategory} onChange={setWordCategory} />
        ) : selectedGame.slug === "imposter-code" ? (
          <PackPicker packs={imposterCodePacks} value={questionPack} onChange={setQuestionPack} />
        ) : (
          <PackPicker packs={wavelengthPacks} value={scalePack} onChange={setScalePack} />
        )}

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
