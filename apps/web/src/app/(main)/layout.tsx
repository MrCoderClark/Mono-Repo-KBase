import { Header } from '@/components/layout/header';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          © 2026 Knowledge Base. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
