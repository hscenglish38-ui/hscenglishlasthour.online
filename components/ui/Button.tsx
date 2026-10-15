import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "glass" | "ghost";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "btn-primary",
  glass: "btn-glass",
  ghost: "btn-ghost",
};

const sizes: Record<Size, string> = {
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = "glass", size = "md", className = "", ...props }: ButtonProps) {
  return <button className={`btn ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}
