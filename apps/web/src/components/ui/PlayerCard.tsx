import { Avatar } from "@/components/ui/AvatarPicker";
import type { Player } from "@/features/lobby/types/room";

type PlayerCardProps = {
  player: Player;
  isCurrentPlayer?: boolean;
  disconnected?: boolean;
};

export function PlayerCard({ player, isCurrentPlayer = false, disconnected = false }: PlayerCardProps) {
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
    <article className={`flex h-[68px] w-full items-center justify-center gap-[14px] rounded-[24px] bg-[var(--surface-inverted-light)] px-5 ${disconnected ? "opacity-35" : ""}`}>
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
  );
}
