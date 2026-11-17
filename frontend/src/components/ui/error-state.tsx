import * as React from "react"
import { AlertCircle, RefreshCw, ArrowLeft, ShieldCheck } from "lucide-react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "./button"

export interface ErrorStateProps {
  title?: string
  message?: string
  guidance?: string
  onRetry?: () => void
  isRetrying?: boolean
  retryLabel?: string
  secondaryActionLabel?: string
  secondaryActionHref?: string
  onSecondaryAction?: () => void
  showSafetyAssurance?: boolean
  className?: string
  compact?: boolean
}

export function ErrorState({
  title = "Something went wrong loading this view",
  message = "We were unable to complete this request. Your data and store records remain completely safe.",
  guidance = "Please check your network connection and try again.",
  onRetry,
  isRetrying = false,
  retryLabel = "Try Again",
  secondaryActionLabel,
  secondaryActionHref,
  onSecondaryAction,
  showSafetyAssurance = true,
  className,
  compact = false,
}: ErrorStateProps) {
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-4 p-4 rounded-xl border border-rose-200 bg-rose-50/50 text-[#0B1220]",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-600 shrink-0">
            <AlertCircle className="h-5 w-5" strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0B1220]">{title}</p>
            <p className="text-xs text-[#5B6577] mt-0.5">{message}</p>
          </div>
        </div>

        {onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            disabled={isRetrying}
            className="shrink-0 h-9"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5 mr-1.5", isRetrying && "animate-spin")}
              strokeWidth={2}
            />
            <span>{isRetrying ? "Retrying..." : retryLabel}</span>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 sm:p-12 md:p-16 rounded-2xl border border-[#E6E8EC] bg-white",
        className
      )}
    >
      {/* Icon Badge */}
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200/70 text-rose-600 mb-4 shadow-sm">
        <AlertCircle className="h-7 w-7" strokeWidth={1.75} />
      </div>

      <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-[#0B1220] max-w-md">
        {title}
      </h3>

      <p className="mt-2 text-sm text-[#5B6577] max-w-md leading-relaxed">
        {message}
      </p>

      {guidance && (
        <p className="mt-1 text-xs text-[#5B6577]/80 max-w-sm">
          {guidance}
        </p>
      )}

      {/* Safety assurance pill (Loss Aversion psychology for merchants) */}
      {showSafetyAssurance && (
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 px-3 py-1 text-[11px] font-medium text-emerald-800">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2} />
          <span>Zero records or transaction balances are affected</span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <Button
            onClick={onRetry}
            disabled={isRetrying}
            size="default"
            className="min-h-[44px]"
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", isRetrying && "animate-spin")}
              strokeWidth={2}
            />
            <span>{isRetrying ? "Retrying..." : retryLabel}</span>
          </Button>
        )}

        {secondaryActionLabel && secondaryActionHref && (
          <Button
            asChild
            variant="outline"
            size="default"
            className="min-h-[44px]"
          >
            <Link to={secondaryActionHref}>
              <ArrowLeft className="h-4 w-4 mr-1.5" strokeWidth={2} />
              <span>{secondaryActionLabel}</span>
            </Link>
          </Button>
        )}

        {secondaryActionLabel && onSecondaryAction && (
          <Button
            onClick={onSecondaryAction}
            variant="outline"
            size="default"
            className="min-h-[44px]"
          >
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
