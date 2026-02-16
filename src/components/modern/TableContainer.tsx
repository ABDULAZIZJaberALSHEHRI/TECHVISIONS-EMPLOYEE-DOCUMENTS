import { cn } from "@/lib/utils";

interface TableContainerProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function TableContainer({
  children,
  title,
  description,
  actions,
  className,
}: TableContainerProps) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 overflow-hidden",
        className
      )}
    >
      {(title || actions) && (
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex justify-between items-center">
            <div>
              {title && (
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{description}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      )}
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
