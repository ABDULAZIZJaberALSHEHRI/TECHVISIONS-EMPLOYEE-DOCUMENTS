import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

export function PageContainer({
  children,
  maxWidth = "max-w-7xl",
  className,
}: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full", maxWidth, className)}>
      {children}
    </div>
  );
}
