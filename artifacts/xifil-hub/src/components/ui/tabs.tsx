import * as React from "react"
import { cn } from "@/components/ui/button"

const TabsContext = React.createContext<{ value: string; onValueChange: (v: string) => void }>({ 
  value: "", onValueChange: () => {} 
})

export const Tabs = ({ value, onValueChange, children, className }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode; className?: string }) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export const TabsList = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return (
    <div className={cn("inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground", className)}>
      {children}
    </div>
  )
}

export const TabsTrigger = ({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) => {
  const { value: selectedValue, onValueChange } = React.useContext(TabsContext)
  const isSelected = selectedValue === value
  
  return (
    <button
      type="button"
      onClick={() => onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isSelected ? "bg-background text-foreground shadow-sm font-mono text-primary" : "hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  )
}

export const TabsContent = ({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) => {
  const { value: selectedValue } = React.useContext(TabsContext)
  
  if (selectedValue !== value) return null
  
  return (
    <div className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", className)}>
      {children}
    </div>
  )
}