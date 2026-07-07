

import type { HTMLAttributes, ReactNode } from "react";

type CardSize = "sm" | "md" | "lg" | "xl";
type CardVariant = "default" | "selected" | "highlight" | "inverted";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  size?: CardSize;
  variant?: CardVariant;
  title?: ReactNode;
  label?: ReactNode;
  description?: ReactNode;
  playerCount?: ReactNode;
  icon?: ReactNode;
  showLabel?: boolean;
  children?: ReactNode;

  /** Figma-compatible aliases */
  textMain?: ReactNode;
  textSub?: ReactNode;
  gameName?: ReactNode;
  gameDescription?: ReactNode;
  showSubText?: boolean;
};

const variantClasses: Record<CardVariant, string> = {
  default: "bg-[var(--surface-inverted-light)] text-[var(--text-inverted)]",
  selected: "bg-[var(--surface-secondary)] text-[var(--text-inverted)]",
  highlight: "bg-[var(--surface-inverted)] text-[var(--text-inverted)]",
  inverted: "bg-[var(--surface-primary-light)] text-[var(--text-primary)]"
};

const sizeClasses: Record<CardSize, string> = {
  sm: "h-[4.9375rem] w-full max-w-[22rem] rounded-[1.6875rem] px-6 py-3 gap-[0.875rem]",
  md: "min-h-[7rem] rounded-[1.75rem] p-6 gap-4",
  lg: "min-h-[10rem] rounded-[2rem] p-7 gap-5",
  xl: "h-[25.25rem] w-full max-w-[16.8125rem] rounded-[3.25rem] px-4 py-8 gap-2.5"
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function DefaultPlayerIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 35"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M14 3.5C7.9 3.5 3.5 8.3 3.5 14.4v5.2C3.5 25.7 7.9 30.5 14 30.5s10.5-4.8 10.5-10.9v-5.2C24.5 8.3 20.1 3.5 14 3.5Z"
        fill="currentColor"
        opacity="0.12"
      />
      <path
        d="M8.5 15.2c.4-4.4 2.7-7.1 5.5-7.1s5.1 2.7 5.5 7.1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M6.2 18.3c0 5 3.2 8.8 7.8 8.8s7.8-3.8 7.8-8.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M10.1 19.2h.1M17.8 19.2h.1"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M11.4 23.1c1.3 1 3.9 1 5.2 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M3.8 15.5c3.6-.1 6.9-1.6 9.2-4.1 2.6 2.8 6.2 4.1 11.2 4.1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Card({
  size = "sm",
  variant = "default",
  title,
  label,
  description,
  playerCount,
  icon,
  showLabel = true,
  children,
  className = "",
  textMain,
  textSub,
  gameName,
  gameDescription,
  showSubText,
  ...props
}: CardProps) {
  const resolvedTitle = gameName ?? textMain ?? title;
  const resolvedLabel = textSub ?? label;
  const resolvedDescription = gameDescription ?? description;
  const shouldShowLabel = showSubText ?? showLabel;

  if (size === "xl") {
    return (
      <div
        className={cx(
          "flex flex-col items-center justify-center text-center transition duration-[var(--motion-fast)]",
          variantClasses[variant],
          sizeClasses.xl,
          variant === "default" && "cursor-pointer",
          className
        )}
        {...props}
      >
        <div className="h-[16.625rem] w-[12.625rem] shrink-0 overflow-hidden rounded-[2.5rem]">
          {children}
        </div>

        <div className="flex w-full shrink-0 flex-col items-center gap-1 text-[var(--text-inverted)]">
          <p className="w-full text-title-sm-extrabold">
            {resolvedTitle}
          </p>

          <div className="flex w-full flex-col items-center gap-0.5 text-footnote-regular">
            {resolvedDescription && <p className="w-full">{resolvedDescription}</p>}
            {playerCount && <p className="w-full">{playerCount}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cx(
        "flex items-center justify-center transition duration-[var(--motion-fast)]",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          <div className="flex h-[2.1875rem] w-[1.75rem] shrink-0 items-center justify-center text-[var(--text-inverted)]">
            {icon ?? <DefaultPlayerIcon className="h-[2.1875rem] w-[1.75rem]" />}
          </div>

          <div className="flex shrink-0 flex-col items-start gap-0.5 whitespace-nowrap">
            <p className="text-title-sm-semibold text-[var(--text-inverted)]">
              {resolvedTitle}
            </p>

            {shouldShowLabel && resolvedLabel && (
              <p className="text-footnote-semibold text-[var(--text-highlight)]">
                {resolvedLabel}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Card;