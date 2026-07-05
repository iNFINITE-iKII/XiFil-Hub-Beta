import * as React from "react"
import { cn } from "@/components/ui/button"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-primary/20 text-primary border border-primary/30",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    destructive: "border-transparent bg-destructive/20 text-destructive border border-destructive/30",
    outline: "text-foreground border border-border",
    success: "border-transparent bg-green-500/20 text-green-400 border border-green-500/30"
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-mono font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 uppercase tracking-wider",
        variants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }