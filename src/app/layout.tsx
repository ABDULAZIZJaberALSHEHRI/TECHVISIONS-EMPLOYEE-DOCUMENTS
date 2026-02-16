import type { Metadata } from "next";
import "./globals.css";
import { BackgroundWrapper } from "@/components/ui/background-wrapper";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

export const metadata: Metadata = {
  title: "DRMS - Document Request Management System",
  description: "Internal document request management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="text-foreground">
        <ThemeProvider>
          <BackgroundWrapper>{children}</BackgroundWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
