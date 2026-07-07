export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M8.2 9.2c1.3-2 3.9-2.7 6-1.5 2 1.2 2.9 3.8 1.9 5.9M7.2 13.5c1.1 2.1 3.6 3.1 5.8 2.2 2.2-.9 3.4-3.3 2.7-5.6M14.9 17.1c-2.4.3-4.6-1.2-5.2-3.5-.6-2.4.7-4.8 3-5.7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

export function DoorOpenIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M13 4h6v16h-6" stroke="currentColor" strokeWidth="2" />
      <path d="M13 20 5 18.5v-13L13 4v16Z" stroke="currentColor" strokeWidth="2" />
      <path d="M10 12h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}

export function DoorEnterIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="2" />
      <path d="m10 17 5-5-5-5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M15 12H3" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function CopyIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M5 15V7a2 2 0 0 1 2-2h8" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

export function SkullIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path d="M12 3a7 7 0 0 0-7 7c0 2.3 1.1 4.4 3 5.7V20h8v-4.3a6.8 6.8 0 0 0 3-5.7 7 7 0 0 0-7-7Z" stroke="currentColor" strokeWidth="2" />
      <path d="M9 11h.01M15 11h.01M10 16v2M14 16v2" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
    </svg>
  );
}

export function DiceIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}
