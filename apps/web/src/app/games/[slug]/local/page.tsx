"use client";

import { type Dispatch, type ReactNode, type SetStateAction, use, useState } from "react";
import { useRouter } from "next/navigation";
import { Braces, Eye, EyeOff, Flag, Minus, Play, Plus, Send, Shuffle, Utensils, Vote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AppScreen } from "@/components/ui/GameUI";
import { WavelengthBoard } from "@/components/ui/WavelengthBoard";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { GameArtwork } from "@/features/lobby/components/GameArtwork";
import { getGameBySlug, playableGameSlugs } from "@/features/lobby/data/games";

type LocalPlayer = { id: string; name: string; eliminated?: boolean };
type CodePhase = "setup" | "pass" | "private" | "answers" | "vote" | "result";
type WavePhase = "setup" | "pass" | "private" | "guess" | "result";
type PromptPair = readonly [string, string];

const codePacks: Record<string, readonly PromptPair[]> = {
  casual: [
    ["What would you bring to a beach day?", "What would you bring to a snowstorm?"],
    ["What app do you open when you are bored?", "What app do you open when you are lost?"],
    ["What object would survive a power cut?", "What object would make a power cut worse?"]
  ],
  food: [
    ["What food belongs at a birthday party?", "What food belongs in a lunchbox?"],
    ["What snack disappears first at a hangout?", "What snack survives until the end?"],
    ["What drink feels refreshing in summer?", "What drink feels cozy in winter?"]
  ],
  school: [
    ["What item saves you before an exam?", "What item distracts you before an exam?"],
    ["What subject creates the most homework?", "What subject creates the least homework?"],
    ["What excuse sounds believable to a teacher?", "What excuse sounds suspicious to a teacher?"]
  ],
  work: [
    ["What meeting should have been an email?", "What email should have been a meeting?"],
    ["What office habit is quietly annoying?", "What office habit is secretly helpful?"],
    ["What tool makes work faster?", "What tool makes work slower?"]
  ],
  party: [
    ["What song gets everyone moving?", "What song clears the room?"],
    ["What item should every party have?", "What item makes a party awkward?"],
    ["What game starts a party quickly?", "What game slows a party down?"]
  ],
  desi: [
    ["What snack belongs with cha?", "What snack belongs with a cold drink?"],
    ["What Eid plan sounds fun?", "What Eid plan sounds exhausting?"],
    ["What Dhaka traffic survival item helps most?", "What item is useless in Dhaka traffic?"]
  ]
} as const;

const wavePacks: Record<string, readonly PromptPair[]> = {
  casual: [["Cold", "Hot"], ["Safe", "Risky"], ["Cheap", "Expensive"], ["Boring", "Exciting"]],
  food: [["Street Food", "Fine Dining"], ["Bland", "Spicy"], ["Snack", "Full Meal"], ["Healthy", "Junk Food"]],
  movies: [["Realistic", "Fantasy"], ["Slow", "Fast"], ["Funny", "Serious"], ["Underrated", "Overrated"]],
  work: [["Focused", "Distracting"], ["Quick Task", "Long Task"], ["Helpful", "Annoying"], ["Casual", "Formal"]],
  party: [["Awkward", "Fun"], ["Chill", "Wild"], ["Small Group", "Big Crowd"], ["Early Night", "Late Night"]],
  desi: [["Rickshaw", "Uber"], ["Cha", "Coffee"], ["Calm Bazaar", "Chaotic Bazaar"], ["Home Food", "Restaurant Food"]]
} as const;

function pick<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function pickMany<T>(items: readonly T[], count: number) {
  return [...items].sort(() => Math.random() - 0.5).slice(0, count);
}

function getWavelengthScore(target: number, guess: number) {
  const distance = Math.abs(target - guess);
  if (distance <= 3) return 5;
  if (distance <= 6) return 4;
  if (distance <= 9) return 3;
  if (distance <= 12) return 2;
  if (distance <= 15) return 1;
  return 0;
}

function pickUnused<T>(items: readonly T[], pack: string, usedIds: string[], resetWhenExhausted: boolean) {
  const entries = items.map((item, index) => ({ id: `${pack}:${index}`, item }));
  let available = entries.filter((entry) => !usedIds.includes(entry.id));
  let history = [...usedIds];
  if (available.length === 0) {
    available = entries.filter((entry) => entry.id !== usedIds.at(-1));
    if (available.length === 0) available = entries;
    if (resetWhenExhausted) history = [];
  }
  const selected = pick(available);
  return { item: selected.item, usedIds: [...history, selected.id] };
}

function TimerPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <section className="mt-5">
      <h2 className="text-center text-body-regular">Timer</h2>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[30, 60, 90, 120, 180].map((seconds) => (
          <button key={seconds} type="button" onClick={() => onChange(seconds)} aria-pressed={value === seconds} className="interactive-pop h-12 rounded-[18px] bg-[var(--surface-primary-light)] text-footnote-semibold aria-pressed:bg-[var(--color-game-accent)] aria-pressed:text-[var(--text-inverted)]">
            {seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}
          </button>
        ))}
      </div>
    </section>
  );
}

export default function LocalGamePage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const { slug } = use(params);
  const game = getGameBySlug(slug);
  const [players, setPlayers] = useState<LocalPlayer[]>([]);
  const [newName, setNewName] = useState("");
  const maxPlayers = game?.maxPlayers ?? 12;

  if (!game || !playableGameSlugs.has(slug) || slug === "imposter") {
    router.replace(slug === "imposter" ? "/games/imposter/local" : "/games");
    return null;
  }

  function addPlayer() {
    const name = newName.trim();
    if (!name || players.some((player) => player.name.toLowerCase() === name.toLowerCase()) || players.length >= maxPlayers) return;
    setPlayers((list) => [...list, { id: crypto.randomUUID(), name }]);
    setNewName("");
  }

  if (slug === "imposter-code") {
    return <LocalImposterCode gameName={game.name} minPlayers={game.minPlayers} players={players} setPlayers={setPlayers} newName={newName} setNewName={setNewName} addPlayer={addPlayer} onExit={() => router.push(`/games/${slug}`)} />;
  }

  return <LocalWavelength gameName={game.name} minPlayers={game.minPlayers} players={players} setPlayers={setPlayers} newName={newName} setNewName={setNewName} addPlayer={addPlayer} onExit={() => router.push(`/games/${slug}`)} />;
}

function PlayerSetup({
  title,
  minPlayers,
  players,
  setPlayers,
  newName,
  setNewName,
  addPlayer,
  children,
  onStart,
  onExit
}: {
  title: string;
  minPlayers: number;
  players: LocalPlayer[];
  setPlayers: Dispatch<SetStateAction<LocalPlayer[]>>;
  newName: string;
  setNewName: (name: string) => void;
  addPlayer: () => void;
  children?: ReactNode;
  onStart: () => void;
  onExit: () => void;
}) {
  return (
    <AppScreen tone="dark" className="overflow-hidden">
      <div className="mx-auto flex min-screen-safe max-w-[25rem] flex-col pb-2">
        <BrandNav title={title} tone="dark" onBack={onExit} />
        {players.length < minPlayers && <p className="mt-8 text-center text-title-sm-bold text-[var(--text-highlight)]">Add at least<br />{minPlayers} players</p>}
        {players.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {players.map((player) => (
              <button key={player.id} type="button" onClick={() => setPlayers((list) => list.filter((item) => item.id !== player.id))} className="inline-flex h-9 items-center gap-1 rounded-full bg-[var(--surface-inverted)] px-3 text-body-bold text-[var(--text-inverted)]">
                {player.name}<span aria-hidden>x</span>
              </button>
            ))}
          </div>
        )}
        <div className="mt-8 flex h-[60px] items-center rounded-[24px] bg-[var(--surface-primary-light)] px-5">
          <input value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addPlayer(); }} placeholder="Player Name" className="min-w-0 flex-1 bg-transparent text-body-bold outline-none placeholder:text-white/15" />
          <button type="button" onClick={addPlayer} disabled={!newName.trim()} className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--surface-secondary)] px-6 text-footnote-semibold text-[var(--text-inverted)] disabled:opacity-35">Add <Plus size={18} /></button>
        </div>
        {children}
        <Button onClick={onStart} disabled={players.length < minPlayers} variant="tertiary" size="lg" showLeftIcon={false} rightIcon={<Play />} className="mt-auto w-full">Start Game</Button>
      </div>
    </AppScreen>
  );
}

function PackSelector<T extends string>({
  packs,
  value,
  onChange
}: {
  packs: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <section className="mt-6">
      <h2 className="text-center text-body-regular">Game Pack</h2>
      <div className="-mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-[112px] pb-4 [scrollbar-width:none]">
        {packs.map((pack) => {
          const selected = value === pack;
          const Icon = pack === "food" ? Utensils : pack === "party" ? Play : pack === "work" ? Braces : Shuffle;
          return (
            <button key={pack} type="button" onClick={() => onChange(pack)} aria-pressed={selected} className={`interactive-pop flex h-[160px] w-[164px] shrink-0 snap-center flex-col items-center justify-center rounded-[38px] border-[4px] bg-[var(--surface-primary-light)] text-[var(--text-primary)] ${selected ? "border-[var(--color-game-accent)]" : "border-transparent"}`}>
              <Icon size={52} className="text-[var(--color-game-accent)]" />
              <span className="mt-4 text-headline-md-bold capitalize">{pack}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function LocalImposterCode(props: {
  gameName: string;
  minPlayers: number;
  players: LocalPlayer[];
  setPlayers: Dispatch<SetStateAction<LocalPlayer[]>>;
  newName: string;
  setNewName: (name: string) => void;
  addPlayer: () => void;
  onExit: () => void;
}) {
  const [phase, setPhase] = useState<CodePhase>("setup");
  const [index, setIndex] = useState(0);
  const [pack, setPack] = useState<keyof typeof codePacks>("casual");
  const [prompt, setPrompt] = useState<readonly [string, string]>(codePacks.casual[0]);
  const [imposterIds, setImposterIds] = useState<string[]>([]);
  const [imposterCount, setImposterCount] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answer, setAnswer] = useState("");
  const [vote, setVote] = useState("");
  const [questionVisible, setQuestionVisible] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [roundTimer, setRoundTimer] = useState(90);
  const [usedPromptIds, setUsedPromptIds] = useState<string[]>([]);
  const activePlayers = props.players.filter((player) => !player.eliminated);
  const current = activePlayers[index];
  const maxImposters = Math.max(1, props.players.length - 1);

  function start() {
    const safeCount = Math.min(imposterCount, Math.max(1, props.players.length - 1));
    const nextPrompt = pickUnused(codePacks[pack], pack, usedPromptIds, false);
    setPrompt(nextPrompt.item);
    setUsedPromptIds(nextPrompt.usedIds);
    setImposterIds(pickMany(props.players, safeCount).map((player) => player.id));
    props.setPlayers((list) => list.map((player) => ({ ...player, eliminated: false })));
    setAnswers({});
    setAnswer("");
    setVote("");
    setRevealed(false);
    setQuestionVisible(false);
    setIndex(0);
    setPhase("pass");
  }

  function anotherGuess() {
    setVote("");
    setPhase("vote");
  }

  function castVote() {
    if (!vote) return;
    props.setPlayers((list) => list.map((player) => player.id === vote ? { ...player, eliminated: true } : player));
    setPhase("result");
  }

  function submit() {
    if (!current || !answer.trim()) return;
    setAnswers((list) => ({ ...list, [current.id]: answer.trim() }));
    setAnswer("");
    setQuestionVisible(false);
    if (index + 1 >= activePlayers.length) setPhase("answers");
    else {
      setIndex((value) => value + 1);
      setPhase("pass");
    }
  }

  if (phase === "setup") {
    return (
      <PlayerSetup title={`${props.gameName} Rules`} minPlayers={props.minPlayers} players={props.players} setPlayers={props.setPlayers} newName={props.newName} setNewName={props.setNewName} addPlayer={props.addPlayer} onStart={start} onExit={props.onExit}>
        <div className="mt-5 flex h-[60px] items-center rounded-[24px] bg-[var(--surface-primary-light)] px-5">
          <span className="flex-1 text-body-bold">Imposter{imposterCount === 1 ? "" : "s"}</span>
          <button type="button" aria-label="Decrease imposters" onClick={() => setImposterCount((value) => Math.max(1, value - 1))} disabled={imposterCount <= 1} className="grid size-10 place-items-center rounded-full bg-[var(--surface-primary)] disabled:opacity-30"><Minus size={19} /></button>
          <output className="w-12 text-center text-title-sm-bold">{Math.min(imposterCount, maxImposters)}</output>
          <button type="button" aria-label="Increase imposters" onClick={() => setImposterCount((value) => Math.min(maxImposters, value + 1))} disabled={imposterCount >= maxImposters} className="grid size-10 place-items-center rounded-full bg-[var(--surface-primary)] disabled:opacity-30"><Plus size={19} /></button>
        </div>
        <PackSelector packs={Object.keys(codePacks) as Array<keyof typeof codePacks>} value={pack} onChange={setPack} />
        <TimerPicker value={roundTimer} onChange={setRoundTimer} />
      </PlayerSetup>
    );
  }

  if (phase === "pass") {
    return (
      <AppScreen tone="dark" className="!p-0">
        <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col px-4 pb-safe pt-20 text-center">
          <BrandNav title="Imposter Code" tone="dark" />
          <p className="my-auto text-title-lg-bold text-[var(--text-highlight)]">Pass the phone to<br />{current?.name}</p>
          <Button onClick={() => setPhase("private")} variant="tertiary" size="lg" showLeftIcon={false} className="w-full">I&apos;m {current?.name}</Button>
        </section>
      </AppScreen>
    );
  }

  if (phase === "private") {
    const personalPrompt = current && imposterIds.includes(current.id) ? prompt[1] : prompt[0];
    return (
      <AppScreen tone="dark" className="!p-0">
        <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col px-4 pb-safe pt-20 text-center">
          <BrandNav title={current?.name ?? "Your Turn"} tone="dark" />
          <div className="mx-auto mt-8 w-24"><GameArtwork gameSlug="imposter-code" tone="light" /></div>
          <div className="mt-8 rounded-[32px] bg-[var(--surface-primary-light)] p-6">
            <p className={`min-h-20 text-title-sm-bold text-[var(--text-highlight)] transition ${questionVisible ? "opacity-100" : "opacity-25 blur-sm"}`}>{questionVisible ? personalPrompt : "Question hidden"}</p>
            <Button onClick={() => setQuestionVisible((value) => !value)} variant="inverted" size="md" showLeftIcon={false} rightIcon={questionVisible ? <EyeOff /> : <Eye />} className="mt-5">{questionVisible ? "Hide" : "Reveal"}</Button>
          </div>
          <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Type answer..." className="mt-6 min-h-36 w-full resize-none rounded-[28px] bg-[var(--surface-primary-light)] px-5 py-4 text-title-sm-semibold outline-none placeholder:text-white/20" />
          <Button onClick={submit} disabled={!answer.trim()} variant="tertiary" size="lg" showLeftIcon={false} rightIcon={<Send />} className="mt-auto w-full">Submit</Button>
        </section>
      </AppScreen>
    );
  }

  if (phase === "answers") {
    return (
      <AppScreen tone="accent" className="!p-0">
        <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col px-4 pb-safe pt-16 text-center">
          <BrandNav title="Answers" tone="light" />
          <h1 className="mt-8 text-title-sm-bold">{prompt[0]}</h1>
          <div className="mt-7 space-y-2 text-left">
            {activePlayers.map((player) => <div key={player.id} className="animate-pop rounded-[24px] bg-[var(--surface-inverted-light)] p-5 text-[var(--text-inverted)]"><p className="text-headline-md-bold">{player.name}</p><p className="mt-2 text-body-semibold">{answers[player.id]}</p></div>)}
          </div>
          <Button onClick={() => setPhase("vote")} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Vote />} className="mt-auto w-full">Start Voting</Button>
        </section>
      </AppScreen>
    );
  }

  if (phase === "vote") {
    return (
      <AppScreen tone="dark" className="!p-0">
        <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col px-4 pb-safe pt-20">
          <BrandNav title="Cast your Vote" tone="dark" />
          <div className="mt-16 space-y-2">
            {activePlayers.map((player) => <button key={player.id} type="button" onClick={() => setVote(player.id)} aria-pressed={vote === player.id} className="flex h-[68px] w-full items-center justify-center rounded-[24px] border-2 border-transparent bg-[var(--surface-primary-light)] text-headline-md-semibold transition aria-pressed:border-[var(--surface-secondary)] aria-pressed:scale-[0.99]"><span>{player.name}</span></button>)}
          </div>
          <Button onClick={castVote} disabled={!vote} variant="primary" size="lg" showLeftIcon={false} className="mt-auto w-full">Cast Vote</Button>
        </section>
      </AppScreen>
    );
  }

  const votedPlayer = props.players.find((player) => player.id === vote);
  const imposters = props.players.filter((player) => imposterIds.includes(player.id));
  const caught = vote ? imposterIds.includes(vote) : false;
  const remaining = props.players.filter((player) => !player.eliminated && player.id !== vote);
  const remainingImposters = remaining.filter((player) => imposterIds.includes(player.id)).length;
  const gameOver = remainingImposters === 0 || remainingImposters >= remaining.length - remainingImposters;
  const showAnswer = gameOver || revealed;
  return (
    <AppScreen tone={showAnswer ? "accent" : "light"} className="!p-0">
      <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col px-4 pb-safe pt-16 text-center">
        <BrandNav title="Results" tone="light" />
        <div className="my-auto">
          <h1 className="text-title-lg-bold">{showAnswer ? `${imposters.map((player) => player.name).join(", ")} had the imposter code` : caught ? `${votedPlayer?.name} had the imposter code` : `${votedPlayer?.name} is not an imposter`}</h1>
          {showAnswer && <p className="mt-4 text-body-bold">Imposter prompt: {prompt[1]}</p>}
        </div>
        <div className="grid gap-2">
          {!showAnswer && <Button onClick={anotherGuess} variant="primary" size="lg" showLeftIcon={false} showRightIcon={false}>Another Guess</Button>}
          {showAnswer && <Button onClick={start} variant="primary" size="lg" showLeftIcon={false} showRightIcon={false}>Another Round</Button>}
          <Button onClick={showAnswer ? props.onExit : () => setRevealed(true)} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Flag />}>{showAnswer ? "End Game" : "Reveal Result"}</Button>
        </div>
      </section>
    </AppScreen>
  );
}

function LocalWavelength(props: {
  gameName: string;
  minPlayers: number;
  players: LocalPlayer[];
  setPlayers: Dispatch<SetStateAction<LocalPlayer[]>>;
  newName: string;
  setNewName: (name: string) => void;
  addPlayer: () => void;
  onExit: () => void;
}) {
  const [phase, setPhase] = useState<WavePhase>("setup");
  const [pack, setPack] = useState<keyof typeof wavePacks>("casual");
  const [scale, setScale] = useState<readonly [string, string]>(wavePacks.casual[0]);
  const [secret, setSecret] = useState(50);
  const [clueGiverIndex, setClueGiverIndex] = useState(0);
  const [clue, setClue] = useState("");
  const [guess, setGuess] = useState(50);
  const [score, setScore] = useState(0);
  const [secretVisible, setSecretVisible] = useState(false);
  const [roundTimer, setRoundTimer] = useState(90);
  const [usedPromptIds, setUsedPromptIds] = useState<string[]>([]);
  const clueGiver = props.players[clueGiverIndex % Math.max(1, props.players.length)];

  function start() {
    const nextScale = pickUnused(wavePacks[pack], pack, usedPromptIds, true);
    setScale(nextScale.item);
    setUsedPromptIds(nextScale.usedIds);
    setSecret(Math.floor(Math.random() * 101));
    setClue("");
    setGuess(50);
    setSecretVisible(false);
    setPhase("pass");
  }

  function lockGuess() {
    setScore((value) => value + getWavelengthScore(secret, guess));
    setPhase("result");
  }

  if (phase === "setup") {
    return (
      <PlayerSetup title={`${props.gameName} Rules`} minPlayers={props.minPlayers} players={props.players} setPlayers={props.setPlayers} newName={props.newName} setNewName={props.setNewName} addPlayer={props.addPlayer} onStart={start} onExit={props.onExit}>
        <PackSelector packs={Object.keys(wavePacks) as Array<keyof typeof wavePacks>} value={pack} onChange={setPack} />
        <TimerPicker value={roundTimer} onChange={setRoundTimer} />
      </PlayerSetup>
    );
  }

  if (phase === "pass") {
    return (
      <AppScreen tone="dark" className="!p-0">
        <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col px-4 pb-safe pt-20 text-center">
          <BrandNav title="Wavelength" tone="dark" />
          <p className="my-auto text-title-lg-bold text-[var(--text-highlight)]">Pass the phone to<br />{clueGiver?.name}</p>
          <Button onClick={() => setPhase("private")} variant="tertiary" size="lg" showLeftIcon={false} className="w-full">I&apos;m {clueGiver?.name}</Button>
        </section>
      </AppScreen>
    );
  }

  if (phase === "private") {
    return (
      <AppScreen tone="light" className="!p-0">
        <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col overflow-hidden rounded-[48px] px-4 pb-safe pt-20 text-center">
          <BrandNav title="Set Rules" tone="dark" />
          <div className="-mx-4 mt-5">
            <WavelengthBoard left={scale[0]} right={scale[1]} value={secret} hideValue={!secretVisible} compact label={secretVisible ? `Secret number ${secret}` : "Secret number hidden"} />
          </div>
          <Button onClick={() => setSecretVisible((value) => !value)} variant={secretVisible ? "inverted" : "primary"} size="md" showLeftIcon={false} rightIcon={secretVisible ? <EyeOff /> : <Eye />} className="mx-auto -mt-1">{secretVisible ? "Hide" : "See number"}</Button>
          <textarea value={clue} onChange={(event) => setClue(event.target.value)} maxLength={80} rows={2} placeholder="Your answer" className="mt-14 min-h-20 w-full resize-none border-b border-[var(--border-primary)] bg-transparent px-4 pb-4 text-center text-title-md-bold outline-none placeholder:text-[var(--text-inverted)]/12 focus:border-[var(--surface-secondary)]" />
          <Button onClick={() => setPhase("guess")} disabled={!clue.trim()} variant="tertiary" size="lg" showLeftIcon={false} rightIcon={<Send />} className="mt-auto w-full">Submit</Button>
        </section>
      </AppScreen>
    );
  }

  if (phase === "guess") {
    return (
      <AppScreen tone="light" className="!p-0">
        <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col overflow-hidden rounded-[48px] px-4 pb-safe pt-20 text-center">
          <BrandNav title="Wavelength" tone="dark" />
          <p className="mt-10 text-body-regular">{clueGiver?.name}&apos;s Answer</p>
          <h1 className="mx-auto mt-2 max-w-[18rem] text-title-md-bold">{clue}</h1>
          <div className="-mx-4 mt-5">
            <WavelengthBoard left={scale[0]} right={scale[1]} value={guess} onChange={setGuess} label={`Guess for ${clue}`} />
          </div>
          <Button onClick={lockGuess} variant="tertiary" size="lg" showLeftIcon={false} rightIcon={<Flag />} className="mt-auto w-full">guess</Button>
        </section>
      </AppScreen>
    );
  }

  const roundScore = getWavelengthScore(secret, guess);
  const clueGiverScore = Math.max(0, roundScore - 1);
  return (
    <AppScreen tone="light" className="!p-0">
      <section className="mx-auto flex min-screen-safe w-full max-w-[25rem] flex-col overflow-hidden rounded-[48px] px-4 pb-safe pt-20 text-center">
        <BrandNav title="Results" tone="dark" />
        <p className="mt-8 text-body-regular">{clueGiver?.name}&apos;s Answer</p>
        <h1 className="mx-auto mt-1 max-w-[18rem] text-title-sm-bold">{clue}</h1>
        <div className="-mx-4 mt-3">
          <WavelengthBoard left={scale[0]} right={scale[1]} value={guess} target={secret} compact label={`Result. Guess ${guess}, answer ${secret}`} />
        </div>
        <div className="mx-auto -mt-2 flex items-center gap-5 text-body-semibold"><span>Guess {guess}</span><span className="grid size-12 place-items-center rounded-full bg-[var(--surface-secondary)] text-title-sm-bold">{roundScore}</span></div>
        <p className="mt-4 text-body-semibold">Clue-giver +{clueGiverScore} · Total {score}</p>
        <div className="mt-auto grid grid-cols-2 gap-2">
          <Button onClick={() => { setClueGiverIndex((value) => value + 1); start(); }} variant="primary" size="lg" showLeftIcon={false} showRightIcon={false}>Next Round</Button>
          <Button onClick={props.onExit} variant="inverted" size="lg" showLeftIcon={false} rightIcon={<Flag />}>End Game</Button>
        </div>
      </section>
    </AppScreen>
  );
}
