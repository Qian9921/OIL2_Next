"use client";

import * as React from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

import { cn } from "@/lib/utils";

interface NumberTickerProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  startValue?: number;
  delay?: number;
  decimalPlaces?: number;
  prefix?: string;
  suffix?: string;
}

export function NumberTicker({
  value,
  startValue = 0,
  delay = 0,
  decimalPlaces = 0,
  prefix = "",
  suffix = "",
  className,
  ...props
}: NumberTickerProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  const motionValue = useMotionValue(startValue);
  const springValue = useSpring(motionValue, {
    damping: 40,
    stiffness: 90,
  });

  React.useEffect(() => {
    if (!isInView) return;

    const timeout = window.setTimeout(() => {
      motionValue.set(value);
    }, delay * 1000);

    return () => window.clearTimeout(timeout);
  }, [delay, isInView, motionValue, value]);

  React.useEffect(() => {
    return springValue.on("change", (latest) => {
      if (!ref.current) return;

      ref.current.textContent = `${prefix}${Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(Number(latest.toFixed(decimalPlaces)))}${suffix}`;
    });
  }, [decimalPlaces, prefix, springValue, suffix]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)} {...props}>
      {`${prefix}${startValue}${suffix}`}
    </span>
  );
}
