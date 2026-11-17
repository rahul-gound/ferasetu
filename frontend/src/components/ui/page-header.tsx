import * as React from "react"
import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

export interface PageHeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  badge?: React.ReactNode
  action?: React.ReactNode
  secondaryAction?: React.ReactNode
  backHref?: string
  onBack?: () => void
  backLabel?: string
  breadcrumbs?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

export function PageHeader({
  title,
  subtitle,
  badge,
  action,
  secondaryAction,
  backHref,
  onBack,
  backLabel = "Back",
  breadcrumbs,
  className,
  children,
}: PageHeaderProps) {
  const renderBackControl = () => {
    if (backHref) {
      return (
        <Link
          to={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5B6577] hover:text-[#0B1220] transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          <span>{backLabel}</span>
        </Link>
      )
    }

    if (onBack) {
      return (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5B6577] hover:text-[#0B1220] transition-colors mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
          <span>{backLabel}</span>
        </button>
      )
    }

    return null
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-4 pb-6 md:pb-8 border-b border-[#E6E8EC]/80",
        className
      )}
    >
      {breadcrumbs && <div className="text-xs text-[#5B6577]">{breadcrumbs}</div>}
      {renderBackControl()}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Title, Badge, Subtitle */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[22px] sm:text-2xl font-semibold tracking-tight text-[#0B1220]">
              {title}
            </h1>
            {badge && <div className="inline-flex items-center">{badge}</div>}
          </div>

          {subtitle && (
            <p className="text-[15px] text-[#5B6577] leading-relaxed max-w-3xl">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right: Actions (1 primary #0052FF CTA + optional secondary action) */}
        {(action || secondaryAction) && (
          <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
            {secondaryAction}
            {action}
          </div>
        )}
      </div>

      {children && <div className="mt-2">{children}</div>}
    </div>
  )
}
