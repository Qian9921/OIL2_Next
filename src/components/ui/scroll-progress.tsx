"use client";

import * as React from "react";
import { motion, useScroll } from "framer-motion";

import { cn } from "@/lib/utils";

interface ScrollProgressProps {
  className?: string;
}

export function ScrollProgress({ className }: ScrollProgressProps) {
  const { scrollYProgress } = useScroll();

  return (
    <motion.div
      aria-hidden="true"
      className={cn(
        "fixed inset-x-0 top-0 z-[100] h-1 origin-left bg-gradient-to-r from-indigo-300 via-sky-300 to-rose-200 shadow-[0_0_24px_rgba(129,140,248,0.22)]",
        className,
      )}
      style={{ scaleX: scrollYProgress }}
    />
  );
}
