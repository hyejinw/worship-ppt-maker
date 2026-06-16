import { clsx } from "clsx";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed",
        {
          "bg-accent text-white hover:bg-accent-light shadow-sm": variant === "primary",
          "bg-card border border-border text-text-primary hover:border-accent/40 hover:bg-bg-sub": variant === "secondary",
          "text-text-muted hover:text-text-primary hover:bg-card": variant === "ghost",
          "bg-error/10 text-error hover:bg-error/20 border border-error/20": variant === "danger",
        },
        {
          "text-sm px-3 py-1.5": size === "sm",
          "text-sm px-4 py-2": size === "md",
          "text-base px-6 py-3": size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
