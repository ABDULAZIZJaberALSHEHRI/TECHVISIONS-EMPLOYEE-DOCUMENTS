import { SessionProvider } from "@/components/providers/SessionProvider";
import { BackgroundWrapper } from "@/components/ui/background-wrapper";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <BackgroundWrapper>{children}</BackgroundWrapper>
    </SessionProvider>
  );
}
