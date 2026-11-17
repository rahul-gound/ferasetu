import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownContextValue {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  triggerRef: React.RefObject<HTMLButtonElement | null>
  contentRef: React.RefObject<HTMLDivElement | null>
}

const DropdownContext = React.createContext<DropdownContextValue | null>(null)

function useDropdown() {
  const context = React.useContext(DropdownContext)
  if (!context) {
    throw new Error("Dropdown components must be used within a DropdownMenu")
  }
  return context
}

export interface DropdownMenuProps {
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DropdownMenu({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
}: DropdownMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const triggerRef = React.useRef<HTMLButtonElement | null>(null)
  const contentRef = React.useRef<HTMLDivElement | null>(null)

  const setOpen = React.useCallback<React.Dispatch<React.SetStateAction<boolean>>>(
    (action) => {
      const nextOpen =
        typeof action === "function" ? action(open) : action
      if (!isControlled) {
        setUncontrolledOpen(nextOpen)
      }
      onOpenChange?.(nextOpen)
    },
    [isControlled, onOpenChange, open]
  )

  // Click outside and escape handling
  React.useEffect(() => {
    if (!open) return

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        contentRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, setOpen])

  return (
    <DropdownContext.Provider
      value={{ open, setOpen, triggerRef, contentRef }}
    >
      <div className="relative inline-block text-left">{children}</div>
    </DropdownContext.Provider>
  )
}

export interface DropdownMenuTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuTriggerProps
>(({ className, onClick, children, asChild = false, ...props }, ref) => {
  const { open, setOpen, triggerRef } = useDropdown()

  const setCombinedRef = (node: HTMLButtonElement | null) => {
    ;(triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node
    if (typeof ref === "function") ref(node)
    else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    if (!e.defaultPrevented) {
      setOpen((prev) => !prev)
    }
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ref: setCombinedRef,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        ;(children as any).props?.onClick?.(e)
        if (!e.defaultPrevented) {
          setOpen((prev) => !prev)
        }
      },
      "aria-haspopup": "menu",
      "aria-expanded": open,
    })
  }

  return (
    <button
      ref={setCombinedRef}
      type="button"
      className={className}
      onClick={handleClick}
      aria-haspopup="menu"
      aria-expanded={open}
      {...props}
    >
      {children}
    </button>
  )
})
DropdownMenuTrigger.displayName = "DropdownMenuTrigger"

export interface DropdownMenuContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  align?: "left" | "right" | "center"
  sideOffset?: number
}

export const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  DropdownMenuContentProps
>(({ className, align = "right", children, ...props }, ref) => {
  const { open, contentRef } = useDropdown()

  const setCombinedRef = (node: HTMLDivElement | null) => {
    ;(contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node
    if (typeof ref === "function") ref(node)
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
  }

  if (!open) return null

  const alignmentClasses = {
    left: "left-0 origin-top-left",
    right: "right-0 origin-top-right",
    center: "left-1/2 -translate-x-1/2 origin-top",
  }

  return (
    <div
      ref={setCombinedRef}
      role="menu"
      tabIndex={-1}
      className={cn(
        "absolute z-50 mt-2 min-w-[200px] rounded-xl border border-[#E6E8EC] bg-white p-1.5 shadow-ambient-md",
        "animate-in fade-in-0 zoom-in-95 duration-150 focus:outline-none",
        alignmentClasses[align],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})
DropdownMenuContent.displayName = "DropdownMenuContent"

export interface DropdownMenuItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  destructive?: boolean
  inset?: boolean
  icon?: React.ReactNode
}

export const DropdownMenuItem = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuItemProps
>(({ className, destructive, inset, icon, children, onClick, disabled, ...props }, ref) => {
  const { setOpen } = useDropdown()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    onClick?.(e)
    if (!e.defaultPrevented) {
      setOpen(false)
    }
  }

  return (
    <button
      ref={ref}
      role="menuitem"
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors select-none text-left",
        "focus:outline-none focus:bg-[#F7F8FA]",
        destructive
          ? "text-rose-600 hover:bg-rose-50 focus:bg-rose-50 hover:text-rose-700"
          : "text-[#0B1220] hover:bg-[#F7F8FA] hover:text-[#0B1220]",
        disabled && "pointer-events-none opacity-40",
        inset && "pl-8",
        className
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0 text-current">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
    </button>
  )
})
DropdownMenuItem.displayName = "DropdownMenuItem"

export const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#5B6577]",
      inset && "pl-8",
      className
    )}
    {...props}
  />
))
DropdownMenuLabel.displayName = "DropdownMenuLabel"

export const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    className={cn("-mx-1 my-1.5 h-px bg-[#E6E8EC]", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"

export const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    className={cn(
      "ml-auto text-xs tracking-widest font-mono text-[#5B6577]",
      className
    )}
    {...props}
  />
)
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"
