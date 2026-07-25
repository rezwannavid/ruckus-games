"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { GameArtwork } from "@/features/lobby/components/GameArtwork";
import { Clock3, Users } from "lucide-react";
import { getGameBySlug } from "@/features/lobby/data/games";

export default function GameDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const router = useRouter();
  const { slug } = use(params);
  const game = getGameBySlug(slug);

  if (!game) {
    return (
      <main className="ruckus-screen min-h-screen px-4 pb-safe pt-safe">
        <div className="mx-auto max-w-[25rem]">
          <BrandNav title="Game Not Found" tone="light" onBack={() => router.push("/games")} />
          <p className="mt-12 text-body-regular">This game is not available yet.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="ruckus-screen min-screen-safe px-[10px] pb-safe pt-safe">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-[393px] flex-col">
        <div className="px-2"><BrandNav tone="light" onBack={() => router.push("/games")} /></div>

        <section className="ruckus-paper mt-8 flex min-h-[555px] flex-col overflow-hidden rounded-[31px]">
          <div className="mx-auto mt-8 h-[220px] w-[220px]">
            <GameArtwork label={game.name[0]} gameSlug={game.slug} />
          </div>

          <h1 className="text-center text-title-md-extrabold">{game.name}</h1>
          <p className="mx-6 mt-10 text-[20px] font-medium leading-[1.3]">
            {game.summary ?? game.description}
          </p>
          <p className="mx-6 mt-3 max-h-[4.5rem] overflow-hidden text-footnote-regular opacity-70">
            {game.slug === "imposter" ? "Everyone will get a single word without the imposter. Everyone has to find out who the imposters are." : game.description}
          </p>
          <div className="mt-auto grid grid-cols-[1fr_1fr_1.4fr] items-center border-t border-black/5 px-5 py-5">
            <span className="flex items-center gap-2"><Users size={22} /><span><strong className="block text-footnote-regular">{game.minPlayers}-{game.maxPlayers}</strong><small className="opacity-50">Players</small></span></span>
            <span className="flex items-center gap-2"><Clock3 size={22} /><span><strong className="block text-footnote-regular">2-3 min</strong><small className="opacity-50">Time</small></span></span>
            <strong className="text-right text-footnote-regular">{game.description}</strong>
          </div>
        </section>

        <Button
          onClick={() => router.push(`/room-required?game=${game.slug}`)}
          variant="tertiary"
          size="xl"
          showLeftIcon={false}
          showRightIcon={false}
          className="mt-5 w-full"
        >
          play {game.name.toLowerCase()}
        </Button>
      </div>
    </main>
  );
}
