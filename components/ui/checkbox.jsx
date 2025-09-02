"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 rounded-md border-[2.5px] border-slate-400 bg-white shadow-md transition-all duration-200 ease-in-out outline-none",
        "dark:border-slate-500 dark:bg-slate-800/80",
        "hover:border-primary hover:shadow-lg hover:bg-primary/12 hover:scale-105",
        "focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/30 focus-visible:shadow-lg",
        "data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-primary data-[state=checked]:via-primary/90 data-[state=checked]:to-primary/70 data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground data-[state=checked]:shadow-lg data-[state=checked]:scale-105",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:shadow-sm",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}>
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-all duration-200 scale-0 data-[state=checked]:scale-100">
        <CheckIcon className="size-3 stroke-[3]" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox }
