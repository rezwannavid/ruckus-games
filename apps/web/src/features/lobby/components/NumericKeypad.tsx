"use client";

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
    <div className="rounded-t-[1.6875rem] border border-white/70 bg-white/45 px-1.5 pb-20 pt-2 backdrop-blur">
      <div className="grid grid-cols-3 gap-1.5">
        {keys.map((key) => (
          <button
            key={key.digit}
            type="button"
            disabled={disabled}
            onClick={() => onDigit(key.digit)}
            className="flex h-[3.125rem] flex-col items-center justify-center rounded-[0.53125rem] bg-white/90 text-[rgba(0,0,0,0.65)] disabled:opacity-50"
          >
            <span className="font-sans text-[1.4375rem] leading-none">
              {key.digit}
            </span>
            {key.letters && (
              <span className="mt-1 text-[0.625rem] font-bold leading-none tracking-[0.2em]">
                {key.letters}
              </span>
            )}
          </button>
        ))}

        <div />

        <button
          type="button"
          disabled={disabled}
          onClick={() => onDigit("0")}
          className="flex h-[3.125rem] items-center justify-center rounded-[0.53125rem] bg-white/90 text-[1.4375rem] leading-none text-[rgba(0,0,0,0.65)] disabled:opacity-50"
        >
          0
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={onDelete}
          aria-label="Delete digit"
          className="flex h-[3.125rem] items-center justify-center rounded-[0.53125rem] text-[var(--text-inverted)] disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-6">
            <path
              d="M10 6h9v12h-9l-6-6 6-6Z"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="2"
            />
            <path
              d="m12 10 4 4m0-4-4 4"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
