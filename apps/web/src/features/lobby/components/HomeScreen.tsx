"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { GameArtwork } from "@/features/lobby/components/GameArtwork";
import { games } from "@/features/lobby/data/games";

type HomeScreenProps = {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onBrowseGames: () => void;
  onGameClick: (gameSlug: string) => void;
  error?: string;
};

const SWIPE_THRESHOLD = 42;

export function HomeScreen({
  onCreateRoom,
  onJoinRoom,
  onGameClick,
  error
}: HomeScreenProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [exitSide, setExitSide] = useState<-1 | 0 | 1>(0);
  const [isDragging, setIsDragging] = useState(false);
  const pointerStart = useRef<number | null>(null);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeGame = games[activeIndex];

  useEffect(() => {
    return () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    };
  }, []);

  function changeGame(delta: -1 | 1, side: -1 | 1) {
    if (exitSide !== 0) return;

    setExitSide(side);
    transitionTimer.current = setTimeout(() => {
      setActiveIndex((index) => (index + delta + games.length) % games.length);
      setDragX(0);
      setExitSide(0);
    }, 190);
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (exitSide !== 0) return;
    pointerStart.current = event.clientX;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (pointerStart.current === null || exitSide !== 0) return;
    const distance = event.clientX - pointerStart.current;
    setDragX(Math.max(-112, Math.min(112, distance)));
  }

  function finishPointer(event: PointerEvent<HTMLDivElement>) {
    if (pointerStart.current === null) return;
    const distance = event.clientX - pointerStart.current;
    pointerStart.current = null;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (distance <= -SWIPE_THRESHOLD) {
      changeGame(1, -1);
    } else if (distance >= SWIPE_THRESHOLD) {
      changeGame(-1, 1);
    } else {
      setDragX(0);
    }
  }

  const activeCardTransform =
    exitSide === 0
      ? `translate3d(${dragX}px, 0, 0) rotate(${dragX * 0.035}deg)`
      : `translate3d(${exitSide * 340}px, -12px, 0) rotate(${exitSide * 13}deg)`;

  return (
    <main className="home-page">
      <div className="home-screen" data-node-id="606:9721">
        <Image
          src="/figma/home/gradient-ellipse.svg"
          alt=""
          width={881}
          height={881}
          priority
          className="home-gradient"
        />

        <header className="home-logo" aria-label="Ruckus Games">
          <Image
            src="/figma/home/ruckus-logo.svg"
            alt=""
            width={64}
            height={39}
            priority
          />
          <span>games</span>
        </header>

        <section className="home-room-actions" aria-label="Room actions">
          <button type="button" className="home-room-button home-room-button--dark" onClick={onCreateRoom}>
            <span>Create Room</span>
            <Image src="/figma/home/door-open.svg" alt="" width={16} height={16} />
          </button>
          <button type="button" className="home-room-button home-room-button--light" onClick={onJoinRoom}>
            <span>Join Room</span>
            <Image src="/figma/home/door-enter.svg" alt="" width={16} height={16} />
          </button>
        </section>

        <p className="home-swipe-label">Swipe to see more games</p>

        <section
          className="home-card-deck"
          aria-roledescription="carousel"
          aria-label="Games"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") changeGame(1, -1);
            if (event.key === "ArrowLeft") changeGame(-1, 1);
          }}
        >
          <div className="home-card-shell home-card-shell--back" aria-hidden="true" />
          <div className="home-card-shell home-card-shell--middle" aria-hidden="true" />
          <div
            className="home-card-shell home-card-shell--front"
            style={{
              transform: activeCardTransform,
              transition: isDragging ? "none" : "transform 190ms cubic-bezier(.22,.8,.3,1)"
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishPointer}
            onPointerCancel={finishPointer}
          >
            <h1>{activeGame.name}</h1>
            <div className="home-card-artwork">
              <GameArtwork gameSlug={activeGame.slug} />
            </div>
            <p className="home-card-description">{activeGame.description}</p>
            <p className="home-card-players">
              <span>{activeGame.minPlayers}-{activeGame.maxPlayers}</span>
              Players
            </p>
          </div>
          <p className="sr-only" aria-live="polite">
            {activeGame.name}, {activeGame.description}, {activeGame.minPlayers} to {activeGame.maxPlayers} players
          </p>
        </section>

        <button
          type="button"
          className="home-select-game"
          onClick={() => onGameClick(activeGame.slug)}
        >
          select game
        </button>

        {error && <p className="home-error" role="alert">{error}</p>}

        <footer className="home-footer">
          <p>made with love by <strong>Rezwan Navid</strong></p>
          <nav aria-label="Rezwan Navid social links">
            <a href="https://www.instagram.com/rezwannavid" aria-label="Instagram">
              <Image src="/figma/home/instagram.svg" alt="" width={24} height={24} />
            </a>
            <a href="https://www.threads.net/@rezwannavid" aria-label="Threads">
              <Image src="/figma/home/threads.svg" alt="" width={24} height={24} />
            </a>
            <a href="https://github.com/rezwannavid" aria-label="GitHub">
              <Image src="/figma/home/github.svg" alt="" width={24} height={24} />
            </a>
          </nav>
          <a className="home-footer-site" href="https://rezwannavid.me">rezwannavid.me</a>
        </footer>
      </div>
    </main>
  );
}
