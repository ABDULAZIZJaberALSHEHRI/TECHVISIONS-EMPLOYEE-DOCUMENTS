import { TopNavBar } from "@/components/modern";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { BackgroundWrapper } from "@/components/ui/background-wrapper";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <BackgroundWrapper>
        <div className="flex min-h-screen flex-col">
          <TopNavBar />
          <main className="flex-1 p-6 lg:p-8">{children}</main>
        </div>
      </BackgroundWrapper>
    </SessionProvider>
  );
}
