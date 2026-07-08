import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--surface-secondary)] px-4 text-[var(--text-inverted-plus)]">
      <section className="w-full max-w-[25rem] text-center">
        <p className="text-display-lg-bold">404</p>
        <h1 className="mt-3 text-title-lg-bold">That page left the room.</h1>
        <p className="mx-auto mt-3 max-w-[20rem] text-body-medium opacity-70">
          The link may be old, or the room may no longer exist.
        </p>
        <Link href="/" className="mt-10 inline-flex h-20 w-full items-center justify-center gap-3 rounded-[28px] bg-[var(--surface-primary)] px-6 text-headline-md-bold text-[var(--text-primary)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[var(--focus-ring)]">
          <ArrowLeft size={30} aria-hidden />
          Back Home
        </Link>
      </section>
    </main>
  );
}
