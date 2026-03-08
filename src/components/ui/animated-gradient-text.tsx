import * as React from "react";

import { cn } from "@/lib/utils";

interface AnimatedGradientTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  colorFrom?: string;
  colorVia?: string;
  colorTo?: string;
}

export function AnimatedGradientText({
  children,
  className,
  colorFrom = "#a855f7",
  colorVia = "#ec4899",
  colorTo = "#06b6d4",
  style,
  ...props
}: AnimatedGradientTextProps) {
  return (
    <span
      className={cn("inline-block bg-clip-text text-transparent", className)}
      style={{
        backgroundImage: `linear-gradient(120deg, ${colorFrom}, ${colorVia}, ${colorTo}, ${colorFrom})`,
        backgroundSize: "220% 100%",
        animation: "gradient-shift 8s linear infinite",
        ...style,
      }}
      {...props}
    >
      {children}
    </span>
  );
}
