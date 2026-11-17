import * as React from "react"
import { cn } from "@/lib/utils"

export type TooltipSide = "top" | "bottom" | "left" | "right"

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: TooltipSide
  delayDuration?: number
  className?: string
  contentClassName?: string
  disabled?: boolean
}

export function Tooltip({
  content,
  children,
  side = "top",
  delayDuration = 150,
  className,
  contentClassName,
  disabled = false,
}: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const id = React.useId()

  const handleMouseEnter = () => {
    if (disabled || !content) return
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delayDuration)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const sideClasses: Record<TooltipSide, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
    left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
    right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
  }

  return (
    <div
      className={cn("relative inline-flex items-center", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      aria-describedby={isVisible ? id : undefined}
    >
      {children}
      {isVisible && !disabled && (
        <div
          id={id}
          role="tooltip"
          className={cn(
            "absolute z-50 whitespace-nowrap rounded-md bg-[#0B1220] px-2.5 py-1 text-xs font-medium text-white shadow-ambient transition-opacity duration-150 select-none pointer-events-none",
            "animate-in fade-in-0 duration-150",
            sideClasses[side],
            contentClassName
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}

// Shadcn compatibility exports
export const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>
export const TooltipTrigger = ({
  children,
  asChild,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean }) => (
  <div {...props}>{children}</div>
)
export const TooltipContent = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "z-50 overflow-hidden rounded-md bg-[#0B1220] px-2.5 py-1 text-xs text-white shadow-ambient animate-in fade-in-0 duration-150",
      className
    )}
    {...props}
  >
    {children}
  </div>
)
