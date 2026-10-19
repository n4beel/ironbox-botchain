"use client";

import { ButtonHTMLAttributes, CSSProperties, forwardRef } from "react";

type Variant = "primary" | "ghost" | "danger";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

/** Heavy uppercase plate buttons with a thick border. Square, like everything else here. */
const variantStyles: Record<Variant, CSSProperties> = {
  primary: { background: "var(--accent)", color: "#0A0D10", border: "2px solid var(--accent)" },
  ghost: { background: "transparent", border: "2px solid var(--border-strong)", color: "var(--text-secondary)" },
  danger: { background: "transparent", border: "2px solid var(--danger)", color: "var(--danger)" },
};

const sizeStyles: Record<Size, string> = {
  sm: "px-4 py-2 text-[12px]",
  md: "px-6 py-3 text-[14px]",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, disabled, children, className = "", style, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[
        "inline-flex items-center justify-center gap-2 font-bold uppercase tracking-[0.1em] transition-opacity",
        "cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
        sizeStyles[size],
        className,
      ].join(" ")}
      style={{ borderRadius: 0, ...variantStyles[variant], ...style }}
      {...props}
    >
      {loading ? (
        <>
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {children}
        </>
      ) : (
        children
      )}
    </button>
  ),
);

Button.displayName = "Button";
export default Button;
