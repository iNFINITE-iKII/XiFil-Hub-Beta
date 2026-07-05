import * as React from "react"
import { cn } from "@/components/ui/button"

export function Dialog({ open, onOpenChange, children }: { open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => onOpenChange?.(false)}
      />
      <div className="z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg sm:rounded-lg animate-in fade-in-0 zoom-in-95 border-primary/30">
        {children}
      </div>
    </div>
  )
}

export function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}>{children}</div>
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("text-lg font-mono font-bold leading-none tracking-tight", className)}>{children}</h2>
}

export function DialogDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}>{children}</div>
}

export function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-4", className)}>{children}</div>
}