import * as React from "react"
import { cn } from "@/lib/utils"

export function BentoGrid({
  className,
  children,
}: {
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-7xl mx-auto p-4 md:p-8",
        className
      )}
    >
      {children}
    </div>
  )
}

export function BentoCard({
  className,
  title,
  description,
  header,
  icon,
  badge,
  children,
}: {
  className?: string
  title?: React.ReactNode
  description?: React.ReactNode
  header?: React.ReactNode
  icon?: React.ReactNode
  badge?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-300",
        className
      )}
    >
      {header && <div className="mb-6 overflow-hidden rounded-xl">{header}</div>}
      <div className="relative z-10 flex flex-col space-y-3">
        <div className="flex items-center justify-between gap-3">
          {icon && <div className="text-slate-800">{icon}</div>}
          {badge && <div>{badge}</div>}
        </div>
        {title && (
          <h4 className="text-lg md:text-xl font-bold tracking-tight text-slate-900">
            {title}
          </h4>
        )}
        {description && (
          <p className="text-sm md:text-base leading-relaxed text-slate-600">
            {description}
          </p>
        )}
        {children}
      </div>
    </div>
  )
}
