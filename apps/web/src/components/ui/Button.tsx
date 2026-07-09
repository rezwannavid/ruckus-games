

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

type ButtonVariant = "primary" | "primary-plus" | "secondary" | "tertiary" | "inverted";
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
  "primary-plus":
    "bg-[var(--button-primary-plus-surface)] text-[var(--button-primary-text)]",
  secondary:
    "bg-[var(--button-secondary-surface)] text-[var(--button-secondary-text)]",
  tertiary:
    "bg-[var(--button-tertiary-surface)] text-[var(--button-tertiary-text)]",
  inverted:
    "bg-[var(--button-inverted-surface)] text-[var(--button-inverted-text)]"
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "h-12 px-6 py-1 gap-2 text-footnote-semibold rounded-[20px]",
  lg: "h-20 px-6 py-1 gap-[13px] text-headline-md-bold rounded-[28px]",
  xl: "h-[7.5rem] px-6 py-1 gap-2 text-title-sm-extrabold"
};

const iconSizeClasses: Record<ButtonSize, string> = {
  md: "size-5",
  lg: "size-[1.875rem]",
  xl: "size-5"
};

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
        "inline-flex items-center justify-center overflow-hidden whitespace-nowrap transition duration-[var(--motion-fast)] will-change-transform",
        "focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[var(--focus-ring)]",
        "disabled:pointer-events-none disabled:opacity-50",
        "hover:brightness-110 active:translate-y-px active:scale-[0.985] active:brightness-90",
        variantClasses[resolvedVariant],
        sizeClasses[resolvedSize],
        className
      )}
      {...props}
    >
      {shouldShowLeftIcon &&
        (resolvedLeftIcon ?? <ArrowLeft aria-hidden className={iconClassName} />)}

      <span>{content}</span>

      {shouldShowRightIcon &&
        (resolvedRightIcon ?? <ArrowRight aria-hidden className={iconClassName} />)}
    </button>
  );
}

export default Button;
