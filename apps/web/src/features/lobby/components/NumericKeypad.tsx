"use client";

import { Delete } from "lucide-react";

type NumericKeypadProps = {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  disabled?: boolean;
};

const keys = [
  { digit: "1", letters: "" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" }
];

export function NumericKeypad({
  onDigit,
  onDelete,
  disabled = false
}: NumericKeypadProps) {
  return (
    <div className="mx-auto w-full max-w-[18rem] px-3 pb-8">
      <div className="grid grid-cols-3 gap-2">
        {keys.map((key) => (
          <button
            key={key.digit}
            type="button"
            disabled={disabled}
            onClick={() => onDigit(key.digit)}
            className="flex aspect-square w-full flex-col items-center justify-center rounded-full bg-[var(--surface-inverted-light)] text-[var(--text-inverted-plus)] transition active:scale-95 disabled:opacity-50"
          >
            <span className="text-title-lg-semibold leading-none">
              {key.digit}
            </span>
          </button>
        ))}

        <div />

        <button
          type="button"
          disabled={disabled}
          onClick={() => onDigit("0")}
          className="flex aspect-square w-full items-center justify-center rounded-full bg-[var(--surface-inverted-light)] text-title-lg-semibold text-[var(--text-inverted-plus)] transition active:scale-95 disabled:opacity-50"
        >
          0
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={onDelete}
          aria-label="Delete digit"
          className="flex aspect-square w-full items-center justify-center rounded-full bg-[var(--surface-primary-light)] text-[var(--text-primary)] transition active:scale-95 disabled:opacity-50"
        >
          <Delete aria-hidden className="size-8" />
        </button>
      </div>
    </div>
  );
}
