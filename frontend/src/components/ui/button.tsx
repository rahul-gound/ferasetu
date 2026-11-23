import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold transition-all duration-180 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0052FF]/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-0.5 active:scale-[0.985] select-none cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[#0052FF] text-white shadow-[0_2px_4px_rgba(0,82,255,0.16),0_1px_2px_rgba(0,0,0,0.06)] hover:bg-[#0047E0] hover:shadow-[0_6px_16px_rgba(0,82,255,0.24),0_2px_4px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 active:bg-[#003BB5] active:translate-y-0.5 active:scale-[0.985] active:shadow-[0_1px_2px_rgba(0,82,255,0.12),inset_0_2px_4px_rgba(0,0,0,0.18)]",
        brand:
          "bg-[#EA580C] text-white shadow-[0_2px_4px_rgba(234,88,12,0.2),0_1px_2px_rgba(0,0,0,0.06)] hover:bg-[#C2410C] hover:shadow-[0_6px_16px_rgba(234,88,12,0.28),0_2px_4px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 active:bg-[#9A3412] active:translate-y-0.5 active:scale-[0.985] active:shadow-[0_1px_2px_rgba(234,88,12,0.14),inset_0_2px_4px_rgba(0,0,0,0.2)]",
        destructive:
          "bg-rose-600 text-white shadow-[0_2px_4px_rgba(225,29,72,0.2)] hover:bg-rose-700 hover:shadow-[0_6px_16px_rgba(225,29,72,0.25)] hover:-translate-y-0.5 active:bg-rose-800 active:translate-y-0.5 active:scale-[0.985] active:shadow-inner",
        outline:
          "border border-slate-200/90 bg-white text-slate-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-slate-50 hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 active:bg-slate-100 active:translate-y-0.5 active:scale-[0.985] active:shadow-inner",
        secondary:
          "bg-slate-100 text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:bg-slate-200/80 hover:-translate-y-0.5 active:bg-slate-200 active:translate-y-0.5 active:scale-[0.985] active:shadow-inner",
        ghost:
          "text-slate-700 hover:bg-slate-100/80 active:bg-slate-200/70 active:translate-y-0.5 active:scale-[0.985]",
        link:
          "text-[#0052FF] underline-offset-4 hover:underline",
        whatsapp:
          "bg-emerald-600 text-white shadow-[0_2px_4px_rgba(5,150,105,0.2)] hover:bg-emerald-700 hover:shadow-[0_6px_16px_rgba(5,150,105,0.25)] hover:-translate-y-0.5 active:bg-emerald-800 active:translate-y-0.5 active:scale-[0.985] active:shadow-inner",
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
