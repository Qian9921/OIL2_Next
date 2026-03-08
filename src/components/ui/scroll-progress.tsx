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
        "fixed inset-x-0 top-0 z-[100] h-1 origin-left bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500 shadow-[0_0_30px_rgba(168,85,247,0.35)]",
        className,
      )}
      style={{ scaleX: scrollYProgress }}
    />
  );
}
