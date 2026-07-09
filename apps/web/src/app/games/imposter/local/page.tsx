"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BriefcaseBusiness, MapPin, Minus, Play, Plus, RotateCcw, Shapes, Shuffle, Skull, Utensils, Vote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AppScreen, VoteCard } from "@/components/ui/GameUI";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { imposterWords } from "@/features/imposter/data/words";

type LocalPlayer = { id: string; name: string; avatarId: number; isImposter?: boolean };
type Phase = "setup" | "pass" | "role" | "ready" | "discussion" | "voting" | "result";

export default function LocalImposterPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<LocalPlayer[]>([]);
  const [newName, setNewName] = useState("");
  const [category, setCategory] = useState("random");
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
  const current = players[index];

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
    const words = imposterWords[category];
    setWord(words[Math.floor(Math.random() * words.length)]);
    setPlayers((list) => list.map((player) => ({ ...player, isImposter: imposters.has(player.id) })));
    setIndex(0);
    setSelectedVote("");
    setHoldingReveal(false);
    setHasSeenRole(false);
    setAnswerRevealed(false);
    setTimeLeft(90);
    setPhase("pass");
  }

  function nextRole() {
    setHasSeenRole(false);
    if (index + 1 >= players.length) {
      setIndex(0);
      setPhase("ready");
    } else {
      setIndex((value) => value + 1);
      setPhase("pass");
    }
  }

  function restartRound() {
    setIndex(0);
    setSelectedVote("");
    setHoldingReveal(false);
    setHasSeenRole(false);
    setAnswerRevealed(false);
    setTimeLeft(90);
    setPhase("discussion");
  }

  if (phase === "setup") {
    return (
      <AppScreen tone="dark" className="overflow-hidden pb-4">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[25rem] flex-col">
          <BrandNav title="Imposter Game Rules" tone="dark" onBack={() => router.push("/games/imposter")} />

          {players.length < 3 && (
            <div className="mt-7 flex items-center justify-center gap-4 text-center text-[var(--text-highlight)]">
              <Image src="/PlayerIcon2.svg" alt="" width={56} height={56} className="size-14 -rotate-12 brightness-0 invert" />
              <p className="text-headline-md-bold">Add at least<br />3 players</p>
              <Image src="/PlayerIcon5.svg" alt="" width={56} height={56} className="size-14 rotate-12 brightness-0 invert" />
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
            <h2 className="text-center text-body-regular">Game Pack</h2>
            <div className="-mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-[112px] pb-3 [scrollbar-width:none]">
              {[
                ["random", "Random", Shuffle],
                ["objects", "Things", Shapes],
                ["food", "Food", Utensils],
                ["places", "Places", MapPin],
                ["jobs", "Jobs", BriefcaseBusiness]
              ].map(([value, label, Icon]) => {
                const selected = category === value;
                return (
                  <button key={String(value)} type="button" onClick={() => setCategory(String(value))} className={`flex h-[182px] w-[180px] shrink-0 snap-center flex-col items-center justify-center rounded-[40px] ${selected ? "bg-[var(--surface-inverted)] text-[var(--text-inverted)]" : "bg-[var(--surface-primary-light)]"}`}>
                    <Icon size={62} className={selected ? "text-[var(--surface-secondary)]" : ""} />
                    <span className="mt-4 text-headline-md-bold">{String(label)}</span>
                  </button>
                );
              })}
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
      <AppScreen tone="blue" className="grid place-items-center">
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
      <AppScreen tone="blue" className="grid place-items-center">
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
          <div className="mt-5 grid grid-cols-2 gap-3">{players.map((player) => <VoteCard key={player.id} player={player} selected={selectedVote === player.id} onClick={() => setSelectedVote(player.id)} />)}</div>
          <Button onClick={() => setPhase("result")} disabled={!selectedVote} variant="tertiary" size="lg" showLeftIcon={false} rightIcon={<Vote />} className="sticky bottom-4 mt-6 w-full">Cast Vote</Button>
        </div>
      </AppScreen>
    );
  }

  const selectedPlayer = players.find((player) => player.id === selectedVote);
  const imposters = players.filter((player) => player.isImposter);
  const guessedCorrectly = Boolean(selectedPlayer?.isImposter);
  const showAnswer = guessedCorrectly || answerRevealed;

  return (
    <AppScreen tone={showAnswer ? "blue" : "light"} className="!p-0">
      <div className={`mx-auto flex min-h-screen max-w-[25rem] flex-col rounded-[48px] px-5 pb-7 pt-16 text-center ${showAnswer ? "" : "bg-[var(--surface-inverted)]"}`}>
        <BrandNav title="Results" tone="light" />
        <div className="flex flex-1 flex-col items-center justify-center">
          {showAnswer ? (
            <>
              <h1 className="text-title-lg-bold">{imposters.map((player) => player.name).join(", ")} {imposters.length === 1 ? "is" : "are"} the <span className="text-[var(--surface-inverted-light)]">imposter</span></h1>
              <p className="mt-4 text-headline-md-bold">The word was {word}</p>
            </>
          ) : (
            <h1 className="text-title-lg-bold">{selectedPlayer?.name} is <span className="text-[var(--text-highlight)]">not</span><br />the imposter</h1>
          )}
        </div>
        <Button onClick={restartRound} variant={showAnswer ? "primary" : "inverted"} size="lg" showLeftIcon={false} rightIcon={<RotateCcw />} className="w-full">Another Round</Button>
        {showAnswer ? (
          <Button onClick={() => router.push("/")} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Skull />} className="mt-2 w-full">End Game</Button>
        ) : (
          <Button onClick={() => setAnswerRevealed(true)} variant="tertiary" size="lg" showLeftIcon={false} rightIcon={<Skull />} className="mt-2 w-full">Reveal Answer</Button>
        )}
      </div>
    </AppScreen>
  );
}
