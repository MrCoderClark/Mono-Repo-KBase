import Link from 'next/link';
import { BookOpen, FileText, Search, Users } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6" />
            <span className="text-xl font-bold">Knowledge Base</span>
          </Link>
          <nav className="flex items-center space-x-4">
            <Link
              href="/articles"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Articles
            </Link>
            <Link
              href="/documents"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Documents
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            IT Knowledge Base
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Your centralized hub for technical documentation, articles, and resources.
            Search, learn, and share knowledge with your team.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/articles"
              className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Browse Articles
            </Link>
            <Link
              href="/documents"
              className="rounded-md border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              View Documents
            </Link>
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-lg border bg-card p-6">
              <FileText className="h-10 w-10 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">Articles</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Browse technical articles, tutorials, and guides written by your team.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <Search className="h-10 w-10 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">Search</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Quickly find what you need with powerful full-text search.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-6">
              <Users className="h-10 w-10 text-primary" />
              <h3 className="mt-4 text-lg font-semibold">Collaborate</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Comment, react, and share knowledge with your colleagues.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 Knowledge Base. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
