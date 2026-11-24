import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF]/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "border-t border-white/20 bg-[#0052FF] text-white shadow-[0_4px_0_0_#003BB5,0_8px_18px_rgba(0,82,255,0.35)] hover:bg-[#0047E0] hover:shadow-[0_5px_0_0_#003BB5,0_12px_22px_rgba(0,82,255,0.45)] hover:-translate-y-0.5 active:bg-[#003BB5] active:translate-y-1 active:shadow-[0_0px_0_0_#003BB5,inset_0_3px_6px_rgba(0,0,0,0.3)]",
        brand:
          "border-t border-white/20 bg-[#EA580C] text-white shadow-[0_4px_0_0_#9A3412,0_8px_18px_rgba(234,88,12,0.35)] hover:bg-[#D9480F] hover:shadow-[0_5px_0_0_#9A3412,0_12px_22px_rgba(234,88,12,0.45)] hover:-translate-y-0.5 active:bg-[#C2410C] active:translate-y-1 active:shadow-[0_0px_0_0_#9A3412,inset_0_3px_6px_rgba(0,0,0,0.3)]",
        destructive:
          "border-t border-white/20 bg-rose-600 text-white shadow-[0_4px_0_0_#9f1239,0_8px_18px_rgba(225,29,72,0.35)] hover:bg-rose-700 hover:shadow-[0_5px_0_0_#9f1239,0_12px_22px_rgba(225,29,72,0.45)] hover:-translate-y-0.5 active:bg-rose-800 active:translate-y-1 active:shadow-[0_0px_0_0_#9f1239,inset_0_3px_6px_rgba(0,0,0,0.3)]",
        outline:
          "border border-slate-200/90 bg-white text-slate-800 shadow-[0_3px_0_0_#e2e8f0,0_4px_12px_rgba(0,0,0,0.05)] hover:bg-slate-50 hover:border-slate-300 hover:shadow-[0_4px_0_0_#cbd5e1,0_6px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 active:bg-slate-100 active:translate-y-1 active:shadow-[0_0px_0_0_#cbd5e1,inset_0_2px_4px_rgba(0,0,0,0.08)]",
        secondary:
          "bg-slate-100 text-slate-900 shadow-[0_3px_0_0_#cbd5e1,0_4px_10px_rgba(0,0,0,0.04)] hover:bg-slate-200/80 hover:shadow-[0_4px_0_0_#94a3b8,0_6px_14px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 active:bg-slate-200 active:translate-y-1 active:shadow-[0_0px_0_0_#94a3b8,inset_0_2px_4px_rgba(0,0,0,0.08)]",
        ghost:
          "text-slate-700 hover:bg-slate-100/80 active:bg-slate-200/70 active:translate-y-0.5",
        link:
          "text-[#0052FF] underline-offset-4 hover:underline",
        whatsapp:
          "border-t border-white/20 bg-emerald-600 text-white shadow-[0_4px_0_0_#065f46,0_8px_18px_rgba(5,150,105,0.35)] hover:bg-emerald-700 hover:shadow-[0_5px_0_0_#065f46,0_12px_22px_rgba(5,150,105,0.45)] hover:-translate-y-0.5 active:bg-emerald-800 active:translate-y-1 active:shadow-[0_0px_0_0_#065f46,inset_0_3px_6px_rgba(0,0,0,0.3)]",
      },
      size: {
        default: "h-11 px-6 py-2.5 text-sm rounded-full min-h-[44px]",
        sm: "h-9 rounded-full px-4 text-xs",
        lg: "h-12 min-h-[48px] rounded-full px-8 text-base font-semibold",
        pill: "h-12 min-h-[48px] rounded-full px-8 text-base font-semibold",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px] rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
