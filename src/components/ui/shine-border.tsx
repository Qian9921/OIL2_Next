"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface ShineBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  borderWidth?: number;
  duration?: number;
  shineColor?: string | string[];
}

export function ShineBorder({
  borderWidth = 1,
  duration = 12,
  shineColor = ["rgba(168,85,247,0.28)", "rgba(236,72,153,0.22)", "rgba(6,182,212,0.22)"],
  className,
  style,
  ...props
}: ShineBorderProps) {
  const colors = Array.isArray(shineColor) ? shineColor.join(",") : shineColor;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 size-full rounded-[inherit] will-change-[background-position]",
        className,
      )}
      style={{
        padding: `${borderWidth}px`,
        backgroundImage: `radial-gradient(circle at top left, transparent 20%, ${colors}, transparent 80%)`,
        backgroundSize: "220% 220%",
        animation: `shine ${duration}s linear infinite`,
        mask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
        ...style,
      }}
      {...props}
    />
  );
}
