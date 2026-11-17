import * as React from "react"
import { cn } from "@/lib/utils"

export interface Column<T> {
  id?: string
  header: React.ReactNode
  accessorKey?: keyof T
  render?: (item: T, index: number) => React.ReactNode
  align?: "left" | "center" | "right"
  className?: string
  headerClassName?: string
  isNumeric?: boolean
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor?: (item: T, index: number) => string | number
  emptyState?: React.ReactNode
  isLoading?: boolean
  loadingRowsCount?: number
  onRowClick?: (item: T) => void
  className?: string
  containerClassName?: string
  bordered?: boolean
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyState,
  isLoading = false,
  loadingRowsCount = 5,
  onRowClick,
  className,
  containerClassName,
  bordered = true,
}: DataTableProps<T>) {
  const getRowKey = (item: T, index: number): string | number => {
    if (keyExtractor) return keyExtractor(item, index)
    if (typeof item === "object" && item !== null && "id" in item) {
      return (item as any).id
    }
    return index
  }

  const alignClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }

  return (
    <div
      className={cn(
        "w-full overflow-hidden bg-white",
        bordered && "rounded-xl border border-[#E6E8EC]",
        containerClassName
      )}
    >
      <div className="overflow-x-auto">
        <table className={cn("w-full border-collapse text-left text-sm", className)}>
          <thead>
            <tr className="border-b border-[#E6E8EC] bg-[#F7F8FA]">
              {columns.map((col, idx) => {
                const align = col.align || (col.isNumeric ? "right" : "left")
                return (
                  <th
                    key={col.id || idx}
                    scope="col"
                    className={cn(
                      "px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#5B6577] whitespace-nowrap",
                      alignClasses[align],
                      col.headerClassName
                    )}
                  >
                    {col.header}
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#E6E8EC]">
            {isLoading ? (
              Array.from({ length: loadingRowsCount }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`} className="animate-pulse">
                  {columns.map((col, cIdx) => (
                    <td key={`skeleton-cell-${cIdx}`} className="px-4 py-3.5">
                      <div className="h-4 w-3/4 rounded bg-slate-200/70" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-sm text-[#5B6577]"
                >
                  {emptyState || (
                    <div className="py-6">
                      <p className="font-medium text-[#0B1220]">No records found</p>
                      <p className="mt-1 text-xs text-[#5B6577]">
                        There are no rows to display at this time.
                      </p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              data.map((item, rowIndex) => {
                const key = getRowKey(item, rowIndex)
                const isClickable = Boolean(onRowClick)

                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(item)}
                    className={cn(
                      "transition-colors duration-100",
                      isClickable
                        ? "cursor-pointer hover:bg-[#F7F8FA] active:bg-slate-100/60"
                        : "hover:bg-[#F7F8FA]/60"
                    )}
                  >
                    {columns.map((col, colIndex) => {
                      const align = col.align || (col.isNumeric ? "right" : "left")
                      const content = col.render
                        ? col.render(item, rowIndex)
                        : col.accessorKey
                        ? (item[col.accessorKey] as any)
                        : null

                      return (
                        <td
                          key={col.id || colIndex}
                          className={cn(
                            "px-4 py-3.5 text-sm text-[#0B1220] whitespace-nowrap",
                            col.isNumeric && "tabular-nums font-mono",
                            alignClasses[align],
                            col.className
                          )}
                        >
                          {content}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
