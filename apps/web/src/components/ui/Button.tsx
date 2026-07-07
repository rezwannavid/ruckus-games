

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "tertiary" | "inverted";
type ButtonSize = "md" | "lg" | "xl";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  showLeftIcon?: boolean;
  showRightIcon?: boolean;
  children?: ReactNode;

  /** Figma-compatible prop aliases */
  btnColor?: ButtonVariant;
  btnSize?: ButtonSize;
  btnText?: string;
  btnLeft?: ReactNode;
  btnRight?: ReactNode;
  btnShowLeftIcon?: boolean;
  btnShowRightIcon?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--button-primary-surface)] text-[var(--button-primary-text)]",
  secondary:
    "bg-[var(--button-secondary-surface)] text-[var(--button-secondary-text)]",
  tertiary:
    "bg-[var(--button-tertiary-surface)] text-[var(--button-tertiary-text)]",
  inverted:
    "bg-[var(--button-inverted-surface)] text-[var(--button-inverted-text)]"
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "h-[3.5rem] px-6 py-1 gap-2 text-body-medium",
  lg: "h-[5rem] px-6 py-1 gap-2 text-title-sm-extrabold",
  xl: "h-[7.5rem] px-6 py-1 gap-2 text-title-sm-extrabold"
};

const iconSizeClasses: Record<ButtonSize, string> = {
  md: "size-5",
  lg: "size-[1.875rem]",
  xl: "size-5"
};

function ArrowLeftIcon({ className = "" }: { className?: string }) {
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
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function ArrowRightIcon({ className = "" }: { className?: string }) {
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
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  showLeftIcon = true,
  showRightIcon = true,
  children,
  className = "",
  disabled,

  btnColor,
  btnSize,
  btnText,
  btnLeft,
  btnRight,
  btnShowLeftIcon,
  btnShowRightIcon,

  type = "button",
  ...props
}: ButtonProps) {
  const resolvedVariant = btnColor ?? variant;
  const resolvedSize = btnSize ?? size;
  const resolvedLeftIcon = btnLeft ?? leftIcon;
  const resolvedRightIcon = btnRight ?? rightIcon;
  const shouldShowLeftIcon = btnShowLeftIcon ?? showLeftIcon;
  const shouldShowRightIcon = btnShowRightIcon ?? showRightIcon;
  const content = btnText ?? children;
  const iconClassName = cx("shrink-0", iconSizeClasses[resolvedSize]);

  return (
    <button
      type={type}
      disabled={disabled}
      className={cx(
        "inline-flex items-center justify-center overflow-hidden rounded-[3rem] whitespace-nowrap transition duration-[var(--motion-fast)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--surface-secondary)]",
        "disabled:pointer-events-none disabled:opacity-50",
        "hover:brightness-105 active:scale-[0.98]",
        variantClasses[resolvedVariant],
        sizeClasses[resolvedSize],
        className
      )}
      {...props}
    >
      {shouldShowLeftIcon &&
        (resolvedLeftIcon ?? <ArrowLeftIcon className={iconClassName} />)}

      <span>{content}</span>

      {shouldShowRightIcon &&
        (resolvedRightIcon ?? <ArrowRightIcon className={iconClassName} />)}
    </button>
  );
}

export default Button;