'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Search, FileText, FolderOpen } from 'lucide-react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  createdAt: string;
  author: {
    name: string;
  };
}

interface Document {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  createdAt: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const handleSearch = (value: string) => {
    setQuery(value);
    // Simple debounce
    setTimeout(() => {
      setDebouncedQuery(value);
    }, 300);
  };

  const { data: articles, isLoading: articlesLoading } = useQuery({
    queryKey: ['search', 'articles', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      const response = await api.get<{ articles: Article[] }>(
        `/articles?search=${encodeURIComponent(debouncedQuery)}`
      );
      return response.data?.articles || [];
    },
    enabled: debouncedQuery.length > 0,
  });

  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ['search', 'documents', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      const response = await api.get<{ documents: Document[] }>(
        `/documents?search=${encodeURIComponent(debouncedQuery)}`
      );
      return response.data?.documents || [];
    },
    enabled: debouncedQuery.length > 0,
  });

  const isLoading = articlesLoading || documentsLoading;
  const hasResults = (articles && articles.length > 0) || (documents && documents.length > 0);

  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-4">Search</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search articles and documents..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 h-12 text-lg"
            autoFocus
          />
        </div>
      </div>

      {!debouncedQuery && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Enter a search term to find articles and documents
          </p>
        </div>
      )}

      {isLoading && debouncedQuery && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && debouncedQuery && !hasResults && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No results found for &quot;{debouncedQuery}&quot;
          </p>
        </div>
      )}

      {!isLoading && hasResults && (
        <div className="space-y-8">
          {articles && articles.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Articles ({articles.length})
              </h2>
              <div className="space-y-3">
                {articles.map((article) => (
                  <Link key={article.id} href={`/articles/${article.slug}`}>
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{article.title}</CardTitle>
                        <CardDescription>
                          By {article.author.name} •{' '}
                          {new Date(article.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      {article.excerpt && (
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {article.excerpt}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {documents && documents.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <FolderOpen className="mr-2 h-5 w-5" />
                Documents ({documents.length})
              </h2>
              <div className="space-y-3">
                {documents.map((doc) => (
                  <Link key={doc.id} href={`/documents/${doc.id}`}>
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{doc.title}</CardTitle>
                        <CardDescription>
                          {doc.fileName} •{' '}
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      {doc.description && (
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {doc.description}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
