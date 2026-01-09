'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  _count: {
    comments: number;
  };
}

interface ArticlesResponse {
  articles: Article[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function ArticlesPage() {
  const { isAuthenticated, user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['articles'],
    queryFn: async () => {
      const response = await api.get<ArticlesResponse>('/articles');
      return response.data;
    },
  });

  const canCreate = isAuthenticated && user && ['ADMIN', 'EDITOR'].includes(user.role);

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
          <p className="text-muted-foreground">
            Browse technical articles and documentation
          </p>
        </div>
        {canCreate && (
          <Link href="/articles/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Article
            </Button>
          </Link>
        )}
      </div>

      <div className="flex items-center space-x-2 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search articles..." className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-2/3 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data?.articles && data.articles.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.articles.map((article) => (
            <Link key={article.id} href={`/articles/${article.slug}`}>
              <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    {article.category && (
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">
                        {article.category.name}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {article._count.comments} comments
                    </span>
                  </div>
                  <CardTitle className="line-clamp-2">{article.title}</CardTitle>
                  <CardDescription>
                    By {article.author.name} •{' '}
                    {new Date(article.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {article.excerpt || 'No excerpt available'}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No articles found</p>
            {canCreate && (
              <Link href="/articles/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first article
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
