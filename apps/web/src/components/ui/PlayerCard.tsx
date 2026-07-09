import { Avatar } from "@/components/ui/AvatarPicker";
import type { Player } from "@/features/lobby/types/room";
import { Trash2 } from "lucide-react";

type PlayerCardProps = {
  player: Player;
  isCurrentPlayer?: boolean;
  disconnected?: boolean;
  onRemove?: () => void;
};

export function PlayerCard({ player, isCurrentPlayer = false, disconnected = false, onRemove }: PlayerCardProps) {
  const label = disconnected
    ? "Disconnected"
    : player.isHost
      ? isCurrentPlayer
        ? "Room Owner (You)"
        : "Room Owner"
      : isCurrentPlayer
        ? "You"
        : "";

  return (
    <div className="flex w-full items-center gap-1">
      <article className={`flex h-[68px] min-w-0 flex-1 items-center justify-center gap-[14px] rounded-[24px] bg-[var(--surface-inverted-light)] px-5 ${disconnected ? "opacity-35" : ""}`}>
        <Avatar avatarId={player.avatarId} name={player.name} />
        <div className="min-w-0">
          <p className={`truncate text-headline-md-semibold ${disconnected ? "line-through" : ""}`}>
            {player.name}
          </p>
          {label && (
            <p className={`text-caption-semibold ${disconnected ? "" : "text-[var(--text-highlight)]"}`}>
              {label}
            </p>
          )}
        </div>
      </article>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${player.name}`}
          className="grid size-10 shrink-0 place-items-center rounded-[18px] bg-[var(--surface-primary)] text-[var(--text-primary)] transition hover:brightness-110 focus-visible:outline-3 focus-visible:outline-[var(--focus-ring)]"
        >
          <Trash2 aria-hidden className="size-4" />
        </button>
      )}
    </div>
  );
}
