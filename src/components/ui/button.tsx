import * as React from "react";
import { VariantProps, cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-indigo-400 to-sky-400 text-white shadow-sm shadow-indigo-100/80 hover:-translate-y-0.5 hover:shadow-md hover:shadow-indigo-100/90",
        destructive:
          "bg-rose-400 text-white shadow-sm shadow-rose-100/80 hover:-translate-y-0.5 hover:bg-rose-500 hover:shadow-md hover:shadow-rose-100/90",
        outline:
          "border border-slate-200/90 bg-white/95 text-slate-700 shadow-sm hover:-translate-y-px hover:border-slate-300 hover:bg-slate-50/90 hover:shadow-sm",
        secondary:
          "bg-gradient-to-r from-emerald-300 to-teal-300 text-slate-900 shadow-sm shadow-emerald-100/70 hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-100/80",
        ghost:
          "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
        link: "text-indigo-500 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-12 rounded-xl px-8 text-sm",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
