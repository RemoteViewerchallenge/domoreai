import * as React from "react"
import { X } from "lucide-react"
import { cn } from "../../lib/utils.js"

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative" onClick={(e) => e.stopPropagation()}>
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
             return React.cloneElement(child as React.ReactElement<{ onOpenChange?: (open: boolean) => void }>, { onOpenChange });
          }
          return child;
        })}
      </div>
    </div>
  )
}

interface DialogTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

const DialogTrigger = ({ asChild, children, onOpenChange }: DialogTriggerProps) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: React.MouseEventHandler }>, {
      onClick: () => onOpenChange?.(true)
    });
  }
  return <button onClick={() => onOpenChange?.(true)}>{children}</button>
}

interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

const DialogContent = ({ className, children, onOpenChange }: DialogContentProps) => {
  return (
    <div className={cn("w-[600px] max-w-[90vw] bg-zinc-950 border border-zinc-800 rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[80vh]", className)}>
        <button 
          onClick={() => onOpenChange?.(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        {children}
    </div>
  )
}

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 p-6 text-center sm:text-left",
      className
    )}
    {...props}
  />
)

const DialogTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle }
