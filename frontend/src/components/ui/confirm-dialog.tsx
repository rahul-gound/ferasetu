import * as React from "react"
import { AlertTriangle, AlertCircle, HelpCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./dialog"
import { Button } from "./button"
import { cn } from "@/lib/utils"

export type ConfirmVariant = "destructive" | "warning" | "default"

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  consequenceNote?: string
  icon?: React.ReactNode
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Proceed",
  cancelLabel = "Cancel",
  variant = "destructive",
  onConfirm,
  onCancel,
  isLoading: externalLoading,
  consequenceNote,
  icon,
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = React.useState(false)
  const isSubmitting = externalLoading !== undefined ? externalLoading : internalLoading

  const handleConfirm = async () => {
    try {
      setInternalLoading(true)
      await onConfirm()
      onOpenChange(false)
    } catch (err) {
      // Allow caller to handle toast/error
    } finally {
      setInternalLoading(false)
    }
  }

  const handleCancel = () => {
    if (isSubmitting) return
    onCancel?.()
    onOpenChange(false)
  }

  const variantIcons = {
    destructive: <AlertTriangle className="h-6 w-6 text-rose-600" strokeWidth={2} />,
    warning: <AlertCircle className="h-6 w-6 text-amber-600" strokeWidth={2} />,
    default: <HelpCircle className="h-6 w-6 text-[#0052FF]" strokeWidth={2} />,
  }

  const variantStyles = {
    destructive: "bg-rose-50 border-rose-200/80 text-rose-600",
    warning: "bg-amber-50 border-amber-200/80 text-amber-600",
    default: "bg-[#EEF4FF] border-[#E0EBFF] text-[#0052FF]",
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent maxWidthClass="max-w-md">
        <DialogHeader className="flex flex-col sm:flex-row items-start gap-4">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-sm",
              variantStyles[variant]
            )}
          >
            {icon || variantIcons[variant]}
          </div>

          <div className="space-y-1.5 flex-1 pr-4">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
        </DialogHeader>

        {consequenceNote && (
          <div className="px-6 py-2 sm:px-8">
            <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-2.5 text-xs text-[#5B6577]">
              {consequenceNote}
            </div>
          </div>
        )}

        <DialogFooter className="mt-4 gap-2">
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="w-full sm:w-auto min-h-[44px]"
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            size="default"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="w-full sm:w-auto min-h-[44px]"
          >
            {isSubmitting ? "Processing..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
