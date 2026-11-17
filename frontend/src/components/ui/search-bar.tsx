import * as React from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SearchBarProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "onChange"> {
  value?: string
  onChange?: (value: string) => void
  onClear?: () => void
  shortcut?: string
  enableShortcutListener?: boolean
  size?: "sm" | "default" | "lg"
  containerClassName?: string
}

export const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      className,
      containerClassName,
      value: controlledValue,
      defaultValue,
      onChange,
      onClear,
      placeholder = "Search...",
      shortcut,
      enableShortcutListener = false,
      size = "default",
      disabled,
      ...props
    },
    ref
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = React.useState(
      defaultValue !== undefined ? String(defaultValue) : ""
    )
    const isControlled = controlledValue !== undefined
    const currentValue = isControlled ? controlledValue : uncontrolledValue

    const inputRef = React.useRef<HTMLInputElement | null>(null)

    const setCombinedRef = (node: HTMLInputElement | null) => {
      inputRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = e.target.value
      if (!isControlled) {
        setUncontrolledValue(nextValue)
      }
      onChange?.(nextValue)
    }

    const handleClear = () => {
      if (!isControlled) {
        setUncontrolledValue("")
      }
      onChange?.("")
      onClear?.()
      inputRef.current?.focus()
    }

    // Keyboard shortcut (⌘K / Ctrl+K) listener
    React.useEffect(() => {
      if (!shortcut && !enableShortcutListener) return

      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
          e.preventDefault()
          inputRef.current?.focus()
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }, [shortcut, enableShortcutListener])

    const sizeClasses = {
      sm: "h-9 pl-8 pr-16 text-xs rounded-md",
      default: "h-11 min-h-[44px] pl-10 pr-20 text-sm rounded-lg",
      lg: "h-12 min-h-[48px] pl-11 pr-24 text-base rounded-lg",
    }

    const iconSizeClasses = {
      sm: "h-3.5 w-3.5 left-2.5",
      default: "h-4 w-4 left-3.5",
      lg: "h-5 w-5 left-4",
    }

    return (
      <div className={cn("relative flex items-center w-full", containerClassName)}>
        <Search
          className={cn(
            "pointer-events-none absolute text-[#5B6577]",
            iconSizeClasses[size]
          )}
          strokeWidth={1.75}
          aria-hidden="true"
        />

        <input
          ref={setCombinedRef}
          type="search"
          value={currentValue}
          onChange={handleChange}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={placeholder}
          className={cn(
            "w-full bg-white text-[#0B1220] font-normal border border-[#E6E8EC] transition-all duration-150",
            "placeholder:text-[#5B6577]/70",
            "focus:outline-none focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20",
            "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400",
            "hover:border-slate-300",
            sizeClasses[size],
            className
          )}
          {...props}
        />

        {/* Right slot: Clear button and/or shortcut pill */}
        <div className="absolute right-2.5 flex items-center gap-1.5">
          {currentValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[#5B6577] hover:bg-slate-100 hover:text-[#0B1220] transition-colors focus:outline-none"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          )}

          {shortcut && !currentValue && (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-[#E6E8EC] bg-[#F7F8FA] px-1.5 py-0.5 text-[10px] font-mono font-medium text-[#5B6577] select-none">
              {shortcut}
            </kbd>
          )}
        </div>
      </div>
    )
  }
)

SearchBar.displayName = "SearchBar"
