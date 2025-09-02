import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-4 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transform active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:from-primary/95 hover:to-primary/85 active:shadow-md",
        destructive:
          "bg-gradient-to-r from-destructive to-destructive/90 text-white shadow-lg shadow-destructive/25 hover:shadow-xl hover:shadow-destructive/30 hover:from-destructive/95 hover:to-destructive/85 focus-visible:ring-destructive/30 dark:from-destructive/80 dark:to-destructive/70 active:shadow-md",
        outline:
          "border-2 border-border bg-gradient-to-r from-background to-background/95 shadow-sm hover:bg-gradient-to-r hover:from-accent/50 hover:to-accent/30 hover:text-accent-foreground hover:border-accent/50 hover:shadow-md dark:bg-gradient-to-r dark:from-input/20 dark:to-input/10 dark:border-input dark:hover:from-input/40 dark:hover:to-input/30",
        secondary:
          "bg-gradient-to-r from-secondary to-secondary/95 text-secondary-foreground shadow-md shadow-secondary/20 hover:shadow-lg hover:shadow-secondary/25 hover:from-secondary/90 hover:to-secondary/85 active:shadow-sm",
        ghost:
          "hover:bg-gradient-to-r hover:from-accent/60 hover:to-accent/40 hover:text-accent-foreground hover:shadow-sm dark:hover:from-accent/40 dark:hover:to-accent/30",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80 transition-colors",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:px-4",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-12 rounded-lg px-8 has-[>svg]:px-6 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />
  );
}

export { Button, buttonVariants }
