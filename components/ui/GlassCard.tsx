import type { HTMLAttributes } from "react";

type Tone = "panel" | "soft";

const tones: Record<Tone, string> = {
  panel: "glass glass-panel",
  soft: "glass-soft glass-card",
};

export interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
}

export function GlassCard({ tone = "panel", className = "", children, ...props }: GlassCardProps) {
  return (
    <div className={`${tones[tone]} ${className}`} {...props}>
      {children}
    </div>
  );
}
