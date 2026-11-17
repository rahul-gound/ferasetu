import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialog() {
  const context = React.useContext(DialogContext)
  if (!context) {
    throw new Error("Dialog compound components must be used within a Dialog")
  }
  return context
}

export interface DialogProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  const setOpen = React.useCallback(
    (value: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(value)
      }
      onOpenChange?.(value)
    },
    [isControlled, onOpenChange]
  )

  return (
    <DialogContext.Provider value={{ open, setOpen }}>
      {children}
    </DialogContext.Provider>
  )
}

export interface DialogTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

export const DialogTrigger = React.forwardRef<
  HTMLButtonElement,
  DialogTriggerProps
>(({ className, onClick, children, asChild, ...props }, ref) => {
  const { setOpen } = useDialog()

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e)
    if (!e.defaultPrevented) {
      setOpen(true)
    }
  }

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        (children as any).props?.onClick?.(e)
        if (!e.defaultPrevented) {
          setOpen(true)
        }
      },
    })
  }

  return (
    <button
      ref={ref}
      type="button"
      className={className}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  )
})
DialogTrigger.displayName = "DialogTrigger"

export interface DialogContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  showCloseButton?: boolean
  onEscapeKeyDown?: (e: KeyboardEvent) => void
  onPointerDownOutside?: () => void
  maxWidthClass?: string
}

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  DialogContentProps
>(
  (
    {
      className,
      children,
      showCloseButton = true,
      onEscapeKeyDown,
      onPointerDownOutside,
      maxWidthClass = "max-w-lg",
      ...props
    },
    ref
  ) => {
    const { open, setOpen } = useDialog()
    const contentRef = React.useRef<HTMLDivElement | null>(null)

    // Handle Escape key
    React.useEffect(() => {
      if (!open) return

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          onEscapeKeyDown?.(event)
          if (!event.defaultPrevented) {
            setOpen(false)
          }
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [open, onEscapeKeyDown, setOpen])

    // Body scroll lock
    React.useEffect(() => {
      if (!open) return
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }, [open])

    if (!open) return null
    if (typeof document === "undefined") return null

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-[#0B1220]/45 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
          aria-hidden="true"
          onClick={() => {
            onPointerDownOutside?.()
            setOpen(false)
          }}
        />

        {/* Modal Card Elevation: Clean flat card with subtle ambient border, no heavy 3D shadow */}
        <div
          ref={(node) => {
            contentRef.current = node
            if (typeof ref === "function") {
              ref(node)
            } else if (ref) {
              ref.current = node
            }
          }}
          role="dialog"
          aria-modal="true"
          className={cn(
            "relative z-10 w-full rounded-2xl border border-[#E6E8EC] bg-white text-[#0B1220] shadow-ambient-md",
            "animate-in fade-in-0 zoom-in-95 duration-200 focus:outline-none",
            maxWidthClass,
            className
          )}
          onClick={(e) => e.stopPropagation()}
          {...props}
        >
          {showCloseButton && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#5B6577] hover:bg-[#F7F8FA] hover:text-[#0B1220] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0052FF]/20"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
          {children}
        </div>
      </div>,
      document.body
    )
  }
)
DialogContent.displayName = "DialogContent"

export const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 px-6 pt-6 pb-4 sm:px-8 sm:pt-8",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-xl font-bold tracking-tight text-[#0B1220] sm:text-2xl",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-[#5B6577] leading-relaxed", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

export const DialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-6 py-2 sm:px-8", className)} {...props} />
)
DialogBody.displayName = "DialogBody"

export const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 px-6 pb-6 pt-4 sm:px-8 sm:pb-8",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

export const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { setOpen } = useDialog()
  return (
    <button
      ref={ref}
      type="button"
      className={className}
      onClick={(e) => {
        onClick?.(e)
        if (!e.defaultPrevented) {
          setOpen(false)
        }
      }}
      {...props}
    />
  )
})
DialogClose.displayName = "DialogClose"
