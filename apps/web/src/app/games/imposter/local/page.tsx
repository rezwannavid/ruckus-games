"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Flag, Plus, RotateCcw, Trash2, Vote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { AppScreen, NumberSlider, VoteCard } from "@/components/ui/GameUI";
import { Tag, Toggle } from "@/components/ui/Controls";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { imposterCategories, imposterWords } from "@/features/imposter/data/words";

type LocalPlayer = { id: string; name: string; avatarId: number; isImposter?: boolean };
type Phase = "setup" | "pass" | "role" | "discussion" | "voting" | "results";

export default function LocalImposterPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<LocalPlayer[]>([]);
  const [newName, setNewName] = useState("");
  const [category, setCategory] = useState("random");
  const [imposterCount, setImposterCount] = useState(1);
  const [hints, setHints] = useState(true);
  const [roundTime, setRoundTime] = useState(90);
  const [phase, setPhase] = useState<Phase>("setup");
  const [index, setIndex] = useState(0);
  const [word, setWord] = useState("");
  const [selectedVote, setSelectedVote] = useState("");
  const [votes, setVotes] = useState<Record<string, string>>({});

  const current = players[index];
  const voteTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.values(votes).forEach((id) => { totals[id] = (totals[id] ?? 0) + 1; });
    return totals;
  }, [votes]);

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
    setVotes({});
    setSelectedVote("");
    setPhase("pass");
  }

  function nextRole() {
    if (index + 1 >= players.length) {
      setIndex(0);
      setPhase("discussion");
    } else {
      setIndex((value) => value + 1);
      setPhase("pass");
    }
  }

  function castVote() {
    if (!current || !selectedVote) return;
    const nextVotes = { ...votes, [current.id]: selectedVote };
    setVotes(nextVotes);
    setSelectedVote("");
    if (index + 1 >= players.length) {
      setIndex(0);
      setPhase("results");
    } else {
      setIndex((value) => value + 1);
      setPhase("pass");
    }
  }

  function endGame() {
    setPhase("setup");
    setPlayers([]);
    setVotes({});
    setIndex(0);
  }

  if (phase === "setup") {
    return (
      <AppScreen tone="light">
        <div className="mx-auto max-w-[42rem]">
          <BrandNav title="Imposter Game Rules" tone="light" onBack={() => router.push("/games/imposter")} />
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <section>
              <div className="flex gap-2">
                <FormField label="Player Name" value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addPlayer(); } }} placeholder="Add a player" />
                <Button aria-label="Add player" onClick={addPlayer} disabled={!newName.trim()} variant="tertiary" size="lg" showLeftIcon={false} showRightIcon={false} className="mt-[26px]"><Plus /></Button>
              </div>
              <div className="mt-4 space-y-2">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center gap-2 rounded-[24px] bg-[var(--surface-inverted-light)] p-3 pl-5">
                    <span className="min-w-0 flex-1 truncate text-headline-md-semibold">{player.name}</span>
                    <button type="button" onClick={() => setPlayers((list) => list.filter((item) => item.id !== player.id))} aria-label={`Remove ${player.name}`} className="grid size-10 place-items-center rounded-full bg-[var(--surface-inverted)]"><Trash2 size={18} /></button>
                  </div>
                ))}
              </div>
              {players.length < 3 && <p className="mt-4 text-footnote-semibold text-[var(--danger)]">Add at least 3 players</p>}
            </section>
            <section className="space-y-4">
              <NumberSlider label="Imposters" value={imposterCount} min={1} max={Math.max(1, players.length - 1)} onChange={setImposterCount} />
              <NumberSlider label="Round time" value={roundTime} min={30} max={300} suffix="s" onChange={setRoundTime} />
              <Toggle label="Hint for Imposters" checked={hints} onChange={setHints} />
              <fieldset className="rounded-[24px] bg-[var(--surface-inverted-light)] p-5">
                <legend className="px-1 text-body-semibold">Game Pack</legend>
                <div className="mt-2 flex flex-wrap gap-2">{imposterCategories.map((item) => <Tag key={item} selected={item === category} onClick={() => setCategory(item)}><span className="capitalize">{item}</span></Tag>)}</div>
              </fieldset>
            </section>
          </div>
          <Button onClick={startGame} disabled={players.length < 3} variant="inverted" size="lg" showLeftIcon={false} className="sticky bottom-4 mt-8 w-full">Start Game</Button>
        </div>
      </AppScreen>
    );
  }

  if (phase === "pass") {
    const passLabel = votes[current?.id] ? "Pass for next vote" : `Pass the phone to ${current?.name}`;
    return (
      <AppScreen tone="blue" className="grid place-items-center">
        <section className="w-full max-w-[25rem] text-center">
          <h1 className="text-title-lg-bold">{passLabel}</h1>
          <p className="mt-3 text-body-medium opacity-65">Only {current?.name} should look at the next screen.</p>
          <Button onClick={() => setPhase(Object.keys(votes).length > 0 ? "voting" : "role")} variant="inverted" size="lg" showLeftIcon={false} className="mt-10 w-full">I&apos;m {current?.name}</Button>
          <Button onClick={endGame} variant="primary-plus" size="md" showLeftIcon={false} rightIcon={<Flag />} className="mt-3 w-full">End Game</Button>
        </section>
      </AppScreen>
    );
  }

  if (phase === "role") {
    return (
      <AppScreen tone="dark" className="grid place-items-center">
        <section className="w-full max-w-[25rem] text-center">
          <p className="text-title-md-extrabold">Swipe up to reveal answer</p>
          <button type="button" className="mt-8 grid min-h-72 w-full place-items-center rounded-[var(--radius-card)] bg-[var(--surface-inverted)] p-7 text-[var(--text-inverted)]">
            <span><EyeOff className="mx-auto" /><span className="mt-5 block text-footnote-semibold text-[var(--text-highlight)]">{current?.isImposter ? "Your role is" : "Your word is"}</span><span className="mt-2 block text-title-lg-bold">{current?.isImposter ? "IMPOSTER" : word}</span></span>
          </button>
          <Button onClick={nextRole} variant="tertiary" size="lg" showLeftIcon={false} className="mt-8 w-full">I&apos;m Ready</Button>
        </section>
      </AppScreen>
    );
  }

  if (phase === "discussion") {
    return (
      <AppScreen tone="light" className="grid place-items-center">
        <section className="w-full max-w-[25rem] text-center">
          <Eye className="mx-auto" size={40} />
          <h1 className="mt-5 text-title-lg-bold">All Players Done</h1>
          <p className="mt-3 text-body-medium opacity-65">Put the phone down, discuss the clues, then begin voting.</p>
          <Button onClick={() => { setIndex(0); setPhase("pass"); }} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Vote />} className="mt-10 w-full">Start Voting Round</Button>
        </section>
      </AppScreen>
    );
  }

  if (phase === "voting") {
    return (
      <AppScreen tone="light">
        <div className="mx-auto max-w-[42rem]">
          <BrandNav title="Cast your Vote" tone="light" />
          <p className="mt-6 text-center text-footnote-semibold">Voting as {current?.name}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{players.map((player) => <VoteCard key={player.id} player={player} selected={selectedVote === player.id} onClick={() => setSelectedVote(player.id)} />)}</div>
          <Button onClick={castVote} disabled={!selectedVote} variant="tertiary" size="lg" showLeftIcon={false} rightIcon={<Vote />} className="sticky bottom-4 mt-6 w-full">Cast Vote</Button>
        </div>
      </AppScreen>
    );
  }

  const imposters = players.filter((player) => player.isImposter);
  return (
    <AppScreen tone="light">
      <div className="mx-auto max-w-[42rem] text-center">
        <BrandNav title="Results" tone="light" />
        <p className="mt-8 text-footnote-semibold text-[var(--text-highlight)]">The word was {word}</p>
        <h1 className="mt-2 text-title-lg-bold">{imposters.map((player) => player.name).join(", ")} {imposters.length === 1 ? "is" : "are"} the imposter</h1>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">{players.map((player) => <VoteCard key={player.id} player={player} votes={voteTotals[player.id] ?? 0} disabled />)}</div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button onClick={startGame} variant="tertiary" size="lg" showLeftIcon={false} rightIcon={<RotateCcw />}>Another Round</Button>
          <Button onClick={() => router.push("/")} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Flag />}>End Game</Button>
        </div>
      </div>
    </AppScreen>
  );
}
