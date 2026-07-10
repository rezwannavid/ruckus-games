"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Minus, Play, Plus, RotateCcw, Shuffle, Skull, Vote } from "lucide-react";
import { Avatar } from "@/components/ui/AvatarPicker";
import { Button } from "@/components/ui/Button";
import { AppScreen } from "@/components/ui/GameUI";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { imposterWords } from "@/features/imposter/data/words";

type LocalPlayer = { id: string; name: string; avatarId: number; isImposter?: boolean; eliminated?: boolean };
type Phase = "setup" | "pass" | "role" | "ready" | "discussion" | "voting" | "result";

const localPacks = [
  { id: "classic", label: "Classic", Icon: Shuffle, categories: [["objects", "Things"], ["places", "Places"], ["food", "Food"], ["animals", "Animals"], ["actions", "Actions"], ["social", "Social"]] },
  { id: "desi", label: "Desi", Icon: MapPin, categories: [["dhaka", "Dhaka"], ["desi-food", "Bangladeshi Food"], ["eid", "Eid"], ["school", "School"], ["family", "Family"], ["cricket", "Cricket"]] }
] as const;

const desiWords: Record<string, string[]> = {
  dhaka: ["Old Dhaka", "Dhanmondi", "Gulshan", "Banani", "New Market", "Farmgate", "Mirpur", "Hatirjheel", "CNG", "Rickshaw", "Traffic Jam", "Metro Rail"],
  "desi-food": ["Fuchka", "Chotpoti", "Kacchi", "Tehari", "Haleem", "Singara", "Jhalmuri", "Mishti Doi", "Panta Bhat", "Hilsa Fry", "Cha", "Borhani"],
  eid: ["Eid Salami", "Panjabi", "Mehendi", "Eid Namaz", "Shemai", "Cow Haat", "Family Photo", "New Clothes", "Iftar Plan", "Eid Traffic"],
  school: ["Tiffin Box", "Coaching Center", "Exam Hall", "Class Captain", "Private Tutor", "School Van", "Report Card", "Assembly", "Campus Adda"],
  family: ["Aunty", "Cousin", "Family Dinner", "Wedding Invite", "Biye Bari", "Gaye Holud", "Nosy Relative", "Family WhatsApp", "Village House"],
  cricket: ["Cricket Bat", "Tape Tennis", "Sakib", "Mirpur Stadium", "Six", "Run Out", "Street Cricket", "Powerplay", "World Cup Match"]
};

function wordsForSelection(selection: string) {
  if (selection === "classic") return ["objects", "places", "food", "animals", "actions", "social"].flatMap((key) => imposterWords[key]);
  if (selection === "desi") return Object.values(desiWords).flat();
  return desiWords[selection] ?? imposterWords[selection] ?? imposterWords.random;
}

export default function LocalImposterPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<LocalPlayer[]>([]);
  const [newName, setNewName] = useState("");
  const [category, setCategory] = useState("classic");
  const [imposterCount, setImposterCount] = useState(1);
  const [hints, setHints] = useState(false);
  const [phase, setPhase] = useState<Phase>("setup");
  const [index, setIndex] = useState(0);
  const [word, setWord] = useState("");
  const [selectedVote, setSelectedVote] = useState("");
  const [holdingReveal, setHoldingReveal] = useState(false);
  const [hasSeenRole, setHasSeenRole] = useState(false);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90);
  const [roundTimer, setRoundTimer] = useState(90);
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const activePlayers = players.filter((player) => !player.eliminated);
  const current = activePlayers[index];

  useEffect(() => {
    if (phase !== "voting") return;
    const timer = window.setInterval(() => setTimeLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  function addPlayer() {
    const name = newName.trim();
    if (!name || players.some((player) => player.name.toLowerCase() === name.toLowerCase()) || players.length >= 12) return;
    setPlayers((list) => [...list, { id: crypto.randomUUID(), name, avatarId: list.length % 14 + 1 }]);
    setNewName("");
  }

  function startGame() {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const imposters = new Set(shuffled.slice(0, imposterCount).map((player) => player.id));
    const words = wordsForSelection(category);
    const available = words.filter((item) => !usedWords.includes(`${category}:${item}`));
    const nextWord = (available.length > 0 ? available : words)[Math.floor(Math.random() * (available.length > 0 ? available.length : words.length))];
    setWord(nextWord);
    setUsedWords((history) => [...history, `${category}:${nextWord}`]);
    setPlayers((list) => list.map((player) => ({ ...player, isImposter: imposters.has(player.id), eliminated: false })));
    setIndex(0);
    setSelectedVote("");
    setHoldingReveal(false);
    setHasSeenRole(false);
    setAnswerRevealed(false);
    setTimeLeft(roundTimer);
    setPhase("pass");
  }

  function nextRole() {
    setHasSeenRole(false);
    if (index + 1 >= activePlayers.length) {
      setIndex(0);
      setPhase("ready");
    } else {
      setIndex((value) => value + 1);
      setPhase("pass");
    }
  }

  function anotherGuess() {
    setSelectedVote("");
    setTimeLeft(roundTimer);
    setPhase("voting");
  }

  function castVote() {
    if (!selectedVote) return;
    setPlayers((list) => list.map((player) => player.id === selectedVote ? { ...player, eliminated: true } : player));
    setPhase("result");
  }

  if (phase === "setup") {
    return (
      <AppScreen tone="dark" className="overflow-hidden pb-4">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[25rem] flex-col">
          <BrandNav title="Imposter Game Rules" tone="dark" onBack={() => router.push("/games/imposter")} />

          {players.length < 3 && (
            <div className="mt-7 flex items-center justify-center gap-4 text-center text-[var(--text-highlight)]">
              <span className="-rotate-12"><Avatar avatarId={2} size="lg" tone="accent" /></span>
              <p className="text-headline-md-bold">Add at least<br />3 players</p>
              <span className="rotate-12"><Avatar avatarId={5} size="lg" tone="accent" /></span>
            </div>
          )}
          {players.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {players.map((player) => (
                <button key={player.id} type="button" onClick={() => setPlayers((list) => list.filter((item) => item.id !== player.id))} className="inline-flex h-9 items-center gap-1 rounded-full bg-[var(--surface-inverted)] px-3 text-body-bold text-[var(--text-inverted)]">
                  {player.name}<span aria-hidden>×</span>
                </button>
              ))}
            </div>
          )}

          <section className="mt-7 space-y-2">
            <div className="flex h-[60px] items-center rounded-[24px] bg-[var(--surface-primary-light)] px-5">
              <input value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addPlayer(); }} placeholder="Player Name" className="min-w-0 flex-1 bg-transparent text-body-bold outline-none placeholder:text-white/15" />
              <button type="button" onClick={addPlayer} disabled={!newName.trim()} className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--surface-secondary)] px-6 text-footnote-semibold text-[var(--text-inverted)] disabled:opacity-35">Add <Plus size={18} /></button>
            </div>
            <div className="flex h-[60px] items-center rounded-[24px] bg-[var(--surface-primary-light)] px-5">
              <span className="flex-1 text-body-bold">Imposters</span>
              <button type="button" onClick={() => setImposterCount((value) => Math.max(1, value - 1))} className="grid size-10 place-items-center rounded-full bg-[var(--surface-primary)]"><Minus size={19} /></button>
              <output className="w-12 text-center text-title-sm-bold">{imposterCount}</output>
              <button type="button" onClick={() => setImposterCount((value) => Math.min(Math.max(1, players.length - 1), value + 1))} className="grid size-10 place-items-center rounded-full bg-[var(--surface-primary)]"><Plus size={19} /></button>
            </div>
            <label className="flex h-[60px] items-center rounded-[24px] bg-[var(--surface-primary-light)] px-5">
              <span className="flex-1 text-body-bold">Hint for Imposters</span>
              <input type="checkbox" checked={hints} onChange={(event) => setHints(event.target.checked)} className="peer sr-only" />
              <span className="relative h-10 w-[74px] rounded-full bg-[var(--surface-primary)] after:absolute after:left-3 after:top-4 after:h-2 after:w-6 after:rounded-full after:bg-white/25 peer-checked:after:left-[38px] peer-checked:after:bg-[var(--surface-secondary)]" />
            </label>
          </section>

          <section className="mt-5">
            <h2 className="text-center text-body-regular">Timer</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[30, 60, 90, 120, 180].map((seconds) => <button key={seconds} type="button" onClick={() => setRoundTimer(seconds)} aria-pressed={roundTimer === seconds} className="interactive-pop h-12 rounded-[18px] bg-[var(--surface-primary-light)] text-footnote-semibold aria-pressed:bg-[var(--color-game-accent)] aria-pressed:text-[var(--text-inverted)]">{seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}</button>)}
            </div>
          </section>

          <section className="mt-5">
            <h2 className="text-center text-body-regular">Game Pack</h2>
            <div className="-mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-[112px] pb-3 [scrollbar-width:none]">
              {localPacks.map((pack) => {
                const selected = category === pack.id || pack.categories.some(([id]) => id === category);
                const Icon = pack.Icon;
                return (
                  <button key={pack.id} type="button" onClick={() => setCategory(pack.id)} aria-pressed={selected} className="interactive-pop flex h-[182px] w-[180px] shrink-0 snap-center flex-col items-center justify-center rounded-[40px] border-4 border-transparent bg-[var(--surface-primary-light)] aria-pressed:border-[var(--color-game-accent)]">
                    <Icon size={62} className="text-[var(--color-game-accent)]" />
                    <span className="mt-4 text-headline-md-bold">{pack.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {(localPacks.find((pack) => pack.id === category || pack.categories.some(([id]) => id === category)) ?? localPacks[0]).categories.map(([id, label]) => (
                <button key={id} type="button" onClick={() => setCategory(id)} aria-pressed={category === id} className="interactive-pop rounded-full border-2 border-[var(--surface-primary-light)] px-4 py-2 text-footnote-semibold aria-pressed:border-[var(--color-game-accent)] aria-pressed:text-[var(--color-game-accent)]">{label}</button>
              ))}
            </div>
          </section>

          <Button onClick={startGame} disabled={players.length < 3} variant="tertiary" size="lg" showLeftIcon={false} rightIcon={<Play size={20} />} className="mt-auto w-full">Start Game</Button>
        </div>
      </AppScreen>
    );
  }

  if (phase === "pass") {
    return (
      <AppScreen tone="dark">
        <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[25rem] flex-col text-center">
          <p className="my-auto text-title-lg-bold text-[var(--text-highlight)]">Pass the phone to {current?.name}</p>
          <div className="mt-auto">
            <Button onClick={() => setPhase("role")} variant="tertiary" size="lg" showLeftIcon={false} className="w-full">I&apos;m {current?.name}</Button>
            <Button onClick={() => router.push("/")} variant="inverted" size="md" showLeftIcon={false} rightIcon={<Skull />} className="mt-3">End Game</Button>
          </div>
        </section>
      </AppScreen>
    );
  }

  if (phase === "role") {
    const roleText = current?.isImposter ? "IMPOSTER" : word;
    return (
      <AppScreen tone="dark" className="overflow-hidden !p-0">
        <div className="relative flex min-h-screen w-full flex-col bg-[var(--surface-primary)] pb-6">
          <div className="absolute inset-x-0 top-0 flex h-[72%] items-center justify-center px-6 text-center">
            <div><p className="text-headline-md-bold">Your {current?.isImposter ? "role" : "word"} is</p><p className="mt-2 break-words text-display-md-semibold">{roleText}</p></div>
          </div>
          <div
            role="button"
            tabIndex={0}
            aria-label="Hold to reveal your role"
            onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setHoldingReveal(true); }}
            onPointerUp={() => { setHoldingReveal(false); setHasSeenRole(true); }}
            onPointerCancel={() => { setHoldingReveal(false); setHasSeenRole(true); }}
            onKeyDown={(event) => { if (event.key === " " || event.key === "Enter") setHoldingReveal(true); }}
            onKeyUp={() => { setHoldingReveal(false); setHasSeenRole(true); }}
            className={`absolute inset-x-0 top-0 z-10 flex h-[85%] w-full touch-none items-center justify-center rounded-b-[60px] bg-[var(--surface-secondary)] px-8 text-center transition-transform duration-300 ease-out ${holdingReveal ? "-translate-y-[72%]" : "translate-y-0"}`}
          >
            {!hasSeenRole && <p className="text-title-md-extrabold">Swipe up or hold to<br />reveal answer</p>}
            {hasSeenRole && !holdingReveal && <p className="text-title-md-extrabold">Press ready when<br />you are</p>}
            <Button onClick={() => router.push("/")} variant="inverted" size="md" showLeftIcon={false} rightIcon={<Skull />} className="absolute top-20">End Game</Button>
          </div>
          <div className="relative z-20 mt-auto px-4">
            <Button onClick={nextRole} disabled={!hasSeenRole || holdingReveal} variant="primary" size="lg" showLeftIcon={false} className="w-full">I&apos;m Ready</Button>
          </div>
        </div>
      </AppScreen>
    );
  }

  if (phase === "ready") {
    return (
      <AppScreen tone="accent" className="grid place-items-center">
        <section className="w-full max-w-[25rem] text-center">
          <h1 className="text-title-lg-bold">All Players Done</h1>
          <p className="mt-3 text-body-medium opacity-65">Put the phone down and start the discussion.</p>
          <Button onClick={() => setPhase("discussion")} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Play />} className="mt-12 w-full">Start Round</Button>
        </section>
      </AppScreen>
    );
  }

  if (phase === "discussion") {
    return (
      <AppScreen tone="accent" className="grid place-items-center">
        <section className="w-full max-w-[25rem] text-center">
          <p className="text-footnote-semibold">Go clockwise</p>
          <h1 className="mt-2 text-display-md-semibold">Start from<br />{players[0]?.name}</h1>
          <Button onClick={() => setPhase("voting")} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Vote />} className="mt-12 w-full">Start Voting Round</Button>
        </section>
      </AppScreen>
    );
  }

  if (phase === "voting") {
    return (
      <AppScreen tone="light">
        <div className="mx-auto max-w-[25rem]">
          <BrandNav title="Cast your Vote" tone="light" />
          <p className="mt-5 text-center text-title-sm-bold tabular-nums">{Math.floor(timeLeft / 60)}m {String(timeLeft % 60).padStart(2, "0")}s</p>
          <div className="mt-5 space-y-2">{activePlayers.map((player) => <button key={player.id} type="button" onClick={() => setSelectedVote(player.id)} aria-pressed={selectedVote === player.id} className="interactive-pop flex h-[68px] w-full items-center justify-center rounded-[24px] border-2 border-transparent bg-[var(--surface-inverted-light)] text-headline-md-semibold aria-pressed:border-[var(--color-game-accent)] aria-pressed:bg-[var(--color-game-accent)]">{player.name}</button>)}</div>
          <Button onClick={castVote} disabled={!selectedVote} variant="tertiary" size="lg" showLeftIcon={false} rightIcon={<Vote />} className="sticky bottom-4 mt-6 w-full">Cast Vote</Button>
        </div>
      </AppScreen>
    );
  }

  const selectedPlayer = players.find((player) => player.id === selectedVote);
  const imposters = players.filter((player) => player.isImposter);
  const guessedCorrectly = Boolean(selectedPlayer?.isImposter);
  const remainingPlayers = players.filter((player) => !player.eliminated && player.id !== selectedVote);
  const remainingImposters = remainingPlayers.filter((player) => player.isImposter).length;
  const remainingRegulars = remainingPlayers.length - remainingImposters;
  const gameOver = remainingImposters === 0 || remainingImposters >= remainingRegulars;
  const showAnswer = gameOver || answerRevealed;

  return (
    <AppScreen tone={showAnswer ? "accent" : "light"} className="!p-0">
      <div className={`mx-auto flex min-h-screen max-w-[25rem] flex-col rounded-[48px] px-5 pb-7 pt-16 text-center ${showAnswer ? "" : "bg-[var(--surface-inverted)]"}`}>
        <BrandNav title="Results" tone="light" />
        <div className="flex flex-1 flex-col items-center justify-center">
          {showAnswer ? (
            <>
              <h1 className="text-title-lg-bold">{imposters.map((player) => player.name).join(", ")} {imposters.length === 1 ? "is" : "are"} the <span className="text-[var(--surface-inverted-light)]">imposter</span></h1>
              <p className="mt-4 text-headline-md-bold">The word was {word}</p>
            </>
          ) : guessedCorrectly ? (
            <h1 className="text-title-lg-bold">{selectedPlayer?.name} is an <span className="text-[var(--text-highlight)]">imposter</span></h1>
          ) : (
            <h1 className="text-title-lg-bold">{selectedPlayer?.name} is <span className="text-[var(--text-highlight)]">not</span><br />the imposter</h1>
          )}
        </div>
        {!showAnswer && <Button onClick={anotherGuess} variant="primary" size="lg" showLeftIcon={false} rightIcon={<RotateCcw />} className="w-full">Another Guess</Button>}
        {showAnswer ? (
          <Button onClick={startGame} variant="primary" size="lg" showLeftIcon={false} rightIcon={<RotateCcw />} className="w-full">Another Round</Button>
        ) : null}
        {showAnswer ? (
          <Button onClick={() => router.push("/")} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Skull />} className="mt-2 w-full">End Game</Button>
        ) : (
          <Button onClick={() => setAnswerRevealed(true)} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Skull />} className="mt-2 w-full">Reveal Result</Button>
        )}
      </div>
    </AppScreen>
  );
}
