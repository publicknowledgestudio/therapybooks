import { Sidebar, MobileNav } from "@/components/layout/sidebar";
import { PrivacyProvider } from "@/lib/privacy";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PrivacyProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="md:pl-56">
          <MobileNav />
          <main className="px-6 py-8 md:px-10 md:py-10">{children}</main>
        </div>
      </div>
    </PrivacyProvider>
  );
}
