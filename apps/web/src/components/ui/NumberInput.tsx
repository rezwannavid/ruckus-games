

"use client";

import { type HTMLAttributes, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type DigitState = "filled" | "not-filled" | "input" | "last";
type NumberInputState = "initial" | "typed" | "joining" | "joined" | "wrong-code";

type RoomCodeDigitProps = HTMLAttributes<HTMLDivElement> & {
  value?: string;
  state?: DigitState;
};

type NumberInputProps = HTMLAttributes<HTMLDivElement> & {
  value?: string;
  length?: number;
  state?: NumberInputState;
  message?: string;
  onTryAgain?: () => void;
  tryAgainLabel?: string;
  renderAction?: ReactNode;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function DoorAddIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
    </svg>
  );
}

export function RoomCodeDigit({
  value = "",
  state = "not-filled",
  className = "",
  ...props
}: RoomCodeDigitProps) {
  const isFilled = state === "filled";
  const isInput = state === "input";
  const isLast = state === "last";

  if (isLast) {
    return (
      <div className={cx("relative h-2 w-[5.25rem] shrink-0", className)} {...props}>
        <div className="absolute inset-x-0 bottom-0 h-2 bg-[var(--surface-secondary)]" />
      </div>
    );
  }

  return (
    <div className={cx("relative h-[5.625rem] w-[5.25rem] shrink-0", className)} {...props}>
      {isFilled && (
        <div className="absolute inset-x-0 top-[1.875rem] -translate-y-1/2 text-center text-display-lg-bold leading-[3.75rem] text-[var(--text-inverted)] transition-all duration-300 ease-out">
          {value}
        </div>
      )}

      {isInput && (
        <div className="absolute inset-x-0 top-[1.875rem] -translate-y-1/2 text-center text-display-lg-bold leading-[3.75rem] text-[var(--text-inverted)] opacity-10 transition-all duration-300 ease-out">
          0
        </div>
      )}

      <div
        className={cx(
          "absolute inset-x-0 h-2 transition-all duration-300 ease-out",
          isFilled
            ? "top-[5.125rem] bg-[var(--surface-secondary)]"
            : isInput
              ? "top-[4.25rem] bg-[var(--icon-inverted-plus)]"
              : "top-[4.25rem] bg-[var(--icon-inverted-plus)]"
        )}
      />
    </div>
  );
}

export function NumberInput({
  value = "",
  length = 4,
  state,
  message,
  onTryAgain,
  tryAgainLabel = "Try Again",
  renderAction,
  className = "",
  ...props
}: NumberInputProps) {
  const normalizedValue = value.slice(0, length);
  const resolvedState: NumberInputState =
    state ?? (normalizedValue.length > 0 ? "typed" : "initial");

  const isStatusState = ["joining", "joined", "wrong-code"].includes(resolvedState);
  const statusMessage =
    message ??
    (resolvedState === "joining"
      ? "Joining"
      : resolvedState === "joined"
        ? "Joined"
        : resolvedState === "wrong-code"
          ? "Wrong Code"
          : "");

  function getDigitState(index: number): DigitState {
    if (isStatusState) {
      return "last";
    }

    if (normalizedValue[index]) {
      return "filled";
    }

    if (index === normalizedValue.length) {
      return "input";
    }

    return "not-filled";
  }

  return (
    <div
      className={cx(
        "inline-flex items-center",
        isStatusState ? "flex-col justify-center gap-5" : "gap-2",
        className
      )}
      {...props}
    >
      {isStatusState && (
        <p
          className={cx(
            "text-title-md-semibold text-center transition-all duration-300 ease-out",
            resolvedState === "joining" && "text-[var(--text-inverted)] opacity-20",
            resolvedState === "joined" && "text-[var(--button-secondary-surface)]",
            resolvedState === "wrong-code" && "text-[var(--text-inverted)]"
          )}
        >
          {statusMessage}
        </p>
      )}

      <div className="flex items-center gap-2">
        {Array.from({ length }).map((_, index) => (
          <RoomCodeDigit
            key={index}
            value={normalizedValue[index] ?? ""}
            state={getDigitState(index)}
          />
        ))}
      </div>

      {resolvedState === "wrong-code" &&
        (renderAction ?? (
          <Button
            onClick={onTryAgain}
            variant="inverted"
            size="md"
            showLeftIcon={false}
            rightIcon={<DoorAddIcon className="size-5" />}
            className="w-[11.0625rem]"
          >
            {tryAgainLabel}
          </Button>
        ))}
    </div>
  );
}

export default NumberInput;