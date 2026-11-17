import * as React from "react"
import { cn } from "@/lib/utils"

export interface SpinnerProps extends React.SVGAttributes<SVGSVGElement> {
  size?: "sm" | "default" | "lg" | "xl"
}

export function Spinner({ size = "default", className, ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    default: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-[2.5px]",
    xl: "h-10 w-10 border-3",
  }

  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block rounded-full border-solid border-[#0052FF] border-r-transparent animate-spin",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800/60",
        className
      )}
      {...props}
    />
  )
}

export interface LoadingStateProps {
  message?: string
  submessage?: string
  variant?: "spinner" | "card" | "table" | "form"
  className?: string
  spinnerSize?: "sm" | "default" | "lg" | "xl"
}

export function LoadingState({
  message = "Loading details...",
  submessage,
  variant = "spinner",
  className,
  spinnerSize = "default",
}: LoadingStateProps) {
  if (variant === "card") {
    return (
      <div
        className={cn(
          "w-full rounded-2xl border border-[#E6E8EC] bg-white p-6 space-y-4 animate-pulse",
          className
        )}
      >
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    )
  }

  if (variant === "table") {
    return (
      <div
        className={cn(
          "w-full rounded-xl border border-[#E6E8EC] bg-white overflow-hidden p-4 space-y-3",
          className
        )}
      >
        <div className="flex justify-between items-center pb-2 border-b border-[#E6E8EC]">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="flex items-center gap-4 py-2">
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/6 ml-auto" />
          </div>
        ))}
      </div>
    )
  }

  if (variant === "form") {
    return (
      <div
        className={cn(
          "w-full rounded-2xl border border-[#E6E8EC] bg-white p-6 space-y-5",
          className
        )}
      >
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
        <Skeleton className="h-11 w-32 rounded-xl mt-4" />
      </div>
    )
  }

  // Default centered spinner state
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center",
        className
      )}
    >
      <Spinner size={spinnerSize} />
      {message && (
        <p className="mt-3.5 text-sm font-medium text-[#0B1220] tracking-tight">
          {message}
        </p>
      )}
      {submessage && (
        <p className="mt-1 text-xs text-[#5B6577] max-w-xs leading-relaxed">
          {submessage}
        </p>
      )}
    </div>
  )
}
