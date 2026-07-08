import { Copy, DoorOpen, LogIn, Skull, Dices } from "lucide-react";
import Image from "next/image";

export function LogoMark({ className = "" }: { className?: string }) {
  return <Image src="/logo.svg" alt="" aria-hidden="true" width={24} height={24} className={className} />;
}

export function DoorOpenIcon({ className = "" }: { className?: string }) {
  return <DoorOpen aria-hidden="true" className={className} />;
}

export function DoorEnterIcon({ className = "" }: { className?: string }) {
  return <LogIn aria-hidden="true" className={className} />;
}

export function CopyIcon({ className = "" }: { className?: string }) {
  return <Copy aria-hidden="true" className={className} />;
}

export function SkullIcon({ className = "" }: { className?: string }) {
  return <Skull aria-hidden="true" className={className} />;
}

export function DiceIcon({ className = "" }: { className?: string }) {
  return <Dices aria-hidden="true" className={className} />;
}
