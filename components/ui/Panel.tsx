import { HTMLAttributes } from "react";

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  noPadding?: boolean;
}

/** A steel plate: square, heavy top rule, flat fill. */
export default function Panel({ elevated, noPadding, children, className = "", style, ...props }: PanelProps) {
  return (
    <div
      className={[noPadding ? "" : "p-5", className].join(" ")}
      style={{
        background: elevated ? "var(--bg-elevated)" : "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        borderTop: "3px solid var(--border-strong)",
        borderRadius: 0,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
