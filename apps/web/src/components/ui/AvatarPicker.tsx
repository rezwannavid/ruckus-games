"use client";

export const AVATAR_IDS = Array.from({ length: 14 }, (_, index) => index + 1);

type AvatarProps = {
  avatarId: number;
  name?: string;
  size?: "sm" | "md" | "lg";
  tone?: "black" | "white" | "accent" | "muted";
  className?: string;
};

export function Avatar({ avatarId, name = "", size = "md", tone = "black", className = "" }: AvatarProps) {
  const dimension = size === "sm" ? 32 : size === "lg" ? 72 : 40;
  const color = tone === "white"
    ? "var(--icon-inverted-plus)"
    : tone === "muted"
      ? "var(--icon-muted)"
    : tone === "accent"
      ? "var(--color-player-accent)"
      : "var(--icon-primary)";

  return (
    <span
      role={name ? "img" : undefined}
      aria-label={name ? `${name}'s avatar` : undefined}
      aria-hidden={name ? undefined : true}
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: dimension,
        height: dimension,
        backgroundColor: color,
        WebkitMaskImage: `url('/PlayerIcon${Math.min(14, Math.max(1, avatarId || 1))}.svg')`,
        maskImage: `url('/PlayerIcon${Math.min(14, Math.max(1, avatarId || 1))}.svg')`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain"
      }}
    />
  );
}

type AvatarPickerProps = {
  value: number | null;
  onChange: (avatarId: number) => void;
  label?: string;
};

export function AvatarPicker({ value, onChange, label = "Choose your avatar" }: AvatarPickerProps) {
  const positions = [
    "left-[8%] top-[4%]", "left-[36%] top-[9%]", "right-[7%] top-0",
    "left-[3%] top-[24%]", "left-[39%] top-[28%]", "right-[3%] top-[22%]",
    "left-[1%] top-[45%]", "left-[39%] top-[48%]", "right-[3%] top-[43%]",
    "left-[8%] top-[66%]", "right-[10%] top-[65%]", "left-[38%] top-[72%]",
    "left-[7%] top-[86%]", "right-[6%] top-[86%]"
  ];

  return (
    <fieldset className="w-full">
      <legend className="sr-only">{label}</legend>
      <div className="relative mx-auto h-[min(590px,63dvh)] min-h-[450px] w-full max-w-[360px]">
        {AVATAR_IDS.map((avatarId) => (
          <button
            key={avatarId}
            type="button"
            onClick={() => onChange(avatarId)}
            aria-label={`Choose avatar ${avatarId}`}
            aria-pressed={value === avatarId}
            className={`interactive-pop absolute z-10 grid size-[82px] place-items-center rounded-full focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[var(--surface-inverted-light)] aria-pressed:z-20 aria-pressed:bg-[var(--surface-inverted-light)] aria-pressed:scale-[1.28] ${positions[avatarId - 1]}`}
            style={{ animationDelay: `${avatarId * 28}ms` }}
          >
            <Avatar avatarId={avatarId} size="lg" className={value === avatarId ? "animate-celebrate" : "animate-spring-in"} />
          </button>
        ))}
      </div>
    </fieldset>
  );
}
