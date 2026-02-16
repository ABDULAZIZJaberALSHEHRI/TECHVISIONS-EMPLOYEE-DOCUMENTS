import type { Metadata } from "next";
import "./globals.css";
import { BackgroundWrapper } from "@/components/ui/background-wrapper";

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
    <html lang="en">
      <body className="text-gray-900">
        <BackgroundWrapper>{children}</BackgroundWrapper>
      </body>
    </html>
  );
}
