import { cn } from "@/lib/utils";

interface FormContainerProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function FormContainer({
  children,
  title,
  description,
  className,
}: FormContainerProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl shadow-lg border border-slate-200 p-8",
        className
      )}
    >
      {(title || description) && (
        <div className="mb-8">
          {title && (
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          )}
          {description && (
            <p className="text-slate-600 mt-2">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
