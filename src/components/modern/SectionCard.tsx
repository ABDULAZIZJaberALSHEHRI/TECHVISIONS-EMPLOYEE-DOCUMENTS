import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function SectionCard({
  title,
  description,
  children,
  actions,
  className,
  style,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl shadow-md border border-slate-200 p-6",
        className
      )}
      style={style}
    >
      {(title || actions) && (
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            {title && (
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-slate-600 mt-1">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
