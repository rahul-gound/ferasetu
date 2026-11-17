import * as React from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface StatTrend {
  value: string | number
  isPositive?: boolean | null // true: up/good, false: down/bad, null: neutral
  label?: string
}

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  value: React.ReactNode
  subtitle?: React.ReactNode
  icon?: React.ReactNode
  trend?: StatTrend
  badge?: React.ReactNode
  footer?: React.ReactNode
  currency?: string
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  badge,
  footer,
  currency,
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-[#E6E8EC] bg-white p-5 sm:p-6 shadow-ambient transition-all duration-200",
        "hover:border-slate-300 hover:shadow-ambient-md",
        className
      )}
      {...props}
    >
      {/* Top row: Title and Icon/Badge */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-xs sm:text-sm font-medium text-[#5B6577] truncate">
          {title}
        </p>

        <div className="flex items-center gap-2">
          {badge}
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EEF4FF] text-[#0052FF] shrink-0">
              {icon}
            </div>
          )}
        </div>
      </div>

      {/* Main Metric Value: Tabular numbers for clear shopkeeper accounting */}
      <div className="flex items-baseline gap-1">
        {currency && (
          <span className="text-lg sm:text-xl font-bold text-[#5B6577]">
            {currency}
          </span>
        )}
        <div className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1220] tabular-nums font-mono">
          {value}
        </div>
      </div>

      {/* Subtitle & Trend Row */}
      {(trend || subtitle) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium tabular-nums border text-[11px]",
                trend.isPositive === true
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : trend.isPositive === false
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              )}
            >
              {trend.isPositive === true ? (
                <TrendingUp className="h-3 w-3" strokeWidth={2} />
              ) : trend.isPositive === false ? (
                <TrendingDown className="h-3 w-3" strokeWidth={2} />
              ) : (
                <Minus className="h-3 w-3" strokeWidth={2} />
              )}
              <span>{trend.value}</span>
              {trend.label && (
                <span className="text-slate-500 font-normal ml-0.5">
                  {trend.label}
                </span>
              )}
            </span>
          )}

          {subtitle && (
            <span className="text-[#5B6577] font-normal leading-normal">
              {subtitle}
            </span>
          )}
        </div>
      )}

      {/* Optional Card Footer */}
      {footer && (
        <div className="mt-4 pt-3 border-t border-[#E6E8EC]/80 text-xs text-[#5B6577]">
          {footer}
        </div>
      )}
    </div>
  )
}
