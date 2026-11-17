import * as React from "react"
import { ChevronDown, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: string
  helperText?: string
  error?: string
  options?: SelectOption[]
  containerClassName?: string
  wrapperClassName?: string
  placeholder?: string
  size?: "sm" | "default" | "lg"
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      containerClassName,
      wrapperClassName,
      label,
      helperText,
      error,
      options,
      children,
      id,
      disabled,
      placeholder,
      size = "default",
      value,
      defaultValue,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const selectId = id || generatedId
    const errorId = `${selectId}-error`
    const helperId = `${selectId}-helper`

    const sizeClasses = {
      sm: "h-9 py-1.5 pl-3 pr-8 text-xs rounded-md",
      default: "h-11 min-h-[44px] py-2.5 pl-3.5 pr-10 text-sm rounded-lg",
      lg: "h-12 min-h-[48px] py-3 pl-4 pr-10 text-base rounded-lg",
    }

    return (
      <div className={cn("w-full space-y-1.5", containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold uppercase tracking-wider text-[#0B1220]"
          >
            {label}
            {props.required && <span className="ml-1 text-rose-500">*</span>}
          </label>
        )}

        <div className={cn("relative", wrapperClassName)}>
          <select
            id={selectId}
            ref={ref}
            disabled={disabled}
            value={value}
            defaultValue={defaultValue}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? errorId : helperText ? helperId : undefined
            }
            className={cn(
              "w-full appearance-none bg-white text-[#0B1220] font-medium border border-[#E6E8EC] transition-all duration-150",
              "focus:outline-none focus:border-[#0052FF] focus:ring-2 focus:ring-[#0052FF]/20",
              "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200",
              error
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 text-rose-950"
                : "hover:border-slate-300",
              sizeClasses[size],
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled className="text-slate-400">
                {placeholder}
              </option>
            )}
            {options
              ? options.map((option) => (
                  <option
                    key={String(option.value)}
                    value={option.value}
                    disabled={option.disabled}
                    className="text-[#0B1220] py-1"
                  >
                    {option.label}
                  </option>
                ))
              : children}
          </select>

          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[#5B6577]">
            <ChevronDown className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
          </div>
        </div>

        {error ? (
          <p
            id={errorId}
            className="flex items-center gap-1.5 text-xs font-medium text-rose-600"
            role="alert"
          >
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
            <span>{error}</span>
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-[#5B6577]">
            {helperText}
          </p>
        ) : null}
      </div>
    )
  }
)

Select.displayName = "Select"

export { Select }
