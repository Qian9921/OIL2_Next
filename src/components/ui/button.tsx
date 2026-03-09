import * as React from "react";
import { VariantProps, cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-indigo-600 text-white shadow-md shadow-indigo-200/90 hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200",
        destructive:
          "bg-rose-500 text-white shadow-md shadow-rose-200/90 hover:-translate-y-0.5 hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-200",
        outline:
          "border border-slate-300 bg-white text-slate-800 shadow-sm hover:-translate-y-px hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-slate-900 hover:shadow-md",
        secondary:
          "bg-emerald-500 text-white shadow-md shadow-emerald-200/90 hover:-translate-y-0.5 hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-200",
        ghost:
          "text-slate-700 hover:bg-slate-100/90 hover:text-slate-950",
        link: "text-indigo-600 underline-offset-4 hover:underline",
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
