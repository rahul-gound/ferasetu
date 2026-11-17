import * as React from "react"
import { Link } from "react-router-dom"
import { PackageOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"

export interface EmptyStateProps {
  icon?: React.ReactNode
  headline: string
  description?: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  secondaryActionLabel?: string
  secondaryActionHref?: string
  onSecondaryAction?: () => void
  badge?: React.ReactNode
  className?: string
  children?: React.ReactNode
}

export function EmptyState({
  icon,
  headline,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
  onSecondaryAction,
  badge,
  className,
  children,
}: EmptyStateProps) {
  const renderPrimaryAction = () => {
    if (!actionLabel) return null

    if (actionHref) {
      return (
        <Button asChild size="default" className="min-h-[44px]">
          <Link to={actionHref}>{actionLabel}</Link>
        </Button>
      )
    }

    if (onAction) {
      return (
        <Button onClick={onAction} size="default" className="min-h-[44px]">
          {actionLabel}
        </Button>
      )
    }

    return null
  }

  const renderSecondaryAction = () => {
    if (!secondaryActionLabel) return null

    if (secondaryActionHref) {
      return (
        <Button asChild variant="outline" size="default" className="min-h-[44px]">
          <Link to={secondaryActionHref}>{secondaryActionLabel}</Link>
        </Button>
      )
    }

    if (onSecondaryAction) {
      return (
        <Button
          onClick={onSecondaryAction}
          variant="outline"
          size="default"
          className="min-h-[44px]"
        >
          {secondaryActionLabel}
        </Button>
      )
    }

    return null
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 md:p-16 rounded-2xl border border-dashed border-[#E6E8EC] bg-white/70",
        className
      )}
    >
      {badge && <div className="mb-4">{badge}</div>}

      {/* Icon Container: Clean subtle neutral surface with primary blue icon */}
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7F8FA] border border-[#E6E8EC] text-[#0052FF] mb-4 shadow-sm">
        {icon || <PackageOpen className="h-7 w-7" strokeWidth={1.75} />}
      </div>

      <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-[#0B1220] max-w-md">
        {headline}
      </h3>

      {description && (
        <p className="mt-2 text-sm text-[#5B6577] max-w-sm sm:max-w-md leading-relaxed">
          {description}
        </p>
      )}

      {/* Actions Slot: Hick's Law, 1 primary action + optional secondary */}
      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {renderPrimaryAction()}
          {renderSecondaryAction()}
        </div>
      )}

      {children && <div className="mt-6 w-full max-w-md">{children}</div>}
    </div>
  )
}
