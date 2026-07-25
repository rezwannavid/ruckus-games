"use client";

import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/AvatarPicker";
import { PhysicsStage } from "@/components/ui/PhysicsStage";
import { BrandNav } from "@/features/lobby/components/BrandNav";
import { CopyIcon } from "@/features/lobby/components/icons";
import { Crown, Eye, KeyRound, X } from "lucide-react";
import type { Player } from "@/features/lobby/types/room";

type RoomLobbyViewProps = {
  roomName?: string;
  roomCode: string;
  players: Player[];
  currentPlayerId: string | null;
  isHost: boolean;
  copyMessage?: string;
  onBack: () => void;
  onCopyLink: () => void;
  onEndRoom: () => void;
  onContinueSetup: () => void;
  onRemovePlayer: (playerId: string) => void;
};

export function RoomLobbyView({
  roomName,
  roomCode,
  players,
  currentPlayerId,
  isHost,
  copyMessage,
  onBack,
  onCopyLink,
  onEndRoom,
  onContinueSetup,
  onRemovePlayer
}: RoomLobbyViewProps) {
  return (
    <main className="ruckus-screen min-screen-safe overflow-hidden px-4 pb-safe pt-safe">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-[393px] flex-col">
        <div className="flex items-start justify-between gap-3">
          <BrandNav title={isHost ? "Your Room" : "Room"} tone="light" onBack={onBack} />
          <Button onClick={onEndRoom} variant="inverted" size="md" showLeftIcon={false} showRightIcon={false}>
            {isHost ? "End Room" : "Leave Room"}
          </Button>
        </div>

        <section className="mt-5">
          <button onClick={onCopyLink} className="flex h-[54px] w-full items-center gap-3 rounded-[17px] border border-white/25 bg-[var(--surface-glass)] px-4 text-left backdrop-blur-md">
            <KeyRound size={20} className="text-[var(--surface-secondary)]" />
            <span className="flex-1 text-title-sm-regular tracking-[.08em]">{roomCode.replace(/./g, "*")}</span>
            <Eye size={20} />
            <CopyIcon className="size-5" />
          </button>
          {(copyMessage || roomName) && <p className="mt-2 text-center text-caption-regular opacity-65">{copyMessage || roomName}</p>}
        </section>

        <section className="relative mt-10 h-[440px]">
          <div className="pointer-events-none absolute inset-x-0 top-[42%] z-20 -translate-y-1/2 text-center">
            <span className="grid place-items-center"><span className="grid size-8 place-items-center rounded-full bg-[var(--surface-inverted-light)] text-[var(--surface-secondary)]">?</span></span>
            <p className="mt-2 text-body-regular opacity-50">1 player is joining</p>
            <p className="-mt-1 text-body-semibold">{players.length} player{players.length === 1 ? "" : "s"} joined</p>
          </div>
          <PhysicsStage
            className="h-full w-full"
            ariaLabel={`${players.length} players in room ${roomCode}`}
            tokens={players.slice(0, 8).map((player) => ({
              id: player.id,
              radius: 59,
              render: (
              <article className="ruckus-paper interactive-pop relative grid h-[118px] w-[118px] place-items-center rounded-full px-3 py-4 text-center">
                <div className="relative">
                  {player.isHost && <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 text-[var(--surface-secondary)]" size={24} />}
                  <Avatar avatarId={player.avatarId} name={player.name} size="lg" />
                </div>
                <p className="-mt-2 max-w-full truncate text-[15px]">{player.name}{player.id === currentPlayerId ? " (you)" : ""}</p>
                {isHost && !player.isHost && <button type="button" onClick={() => onRemovePlayer(player.id)} aria-label={`Remove ${player.name}`} className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-[var(--surface-primary)] text-[var(--text-primary)]"><X size={13} /></button>}
              </article>
              )
            }))}
          />
        </section>

        <Button
          onClick={onContinueSetup}
          variant="tertiary"
          size="lg"
          showLeftIcon={false}
          showRightIcon={false}
          className="mx-auto mt-auto w-[238px]"
        >
          {isHost ? "select games" : "show games"}
        </Button>
      </div>
    </main>
  );
}
