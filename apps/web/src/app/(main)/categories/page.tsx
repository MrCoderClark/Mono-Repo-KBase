'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { FolderOpen, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count: {
    articles: number;
  };
}

interface CategoriesResponse {
  categories: Category[];
}

export default function CategoriesPage() {
  const { user, isAuthenticated } = useAuth();
  const canCreate = isAuthenticated && user && ['ADMIN', 'EDITOR'].includes(user.role);

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get<CategoriesResponse>('/categories');
      return response.data;
    },
  });

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Browse articles by category
          </p>
        </div>
        {canCreate && (
          <Link href="/categories/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Category
            </Button>
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : data?.categories && data.categories.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.categories.map((category) => (
            <Link key={category.id} href={`/categories/${category.slug}`}>
              <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-primary/10 rounded">
                      <FolderOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <CardDescription>
                        {category._count.articles} articles
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                {category.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {category.description}
                    </p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No categories found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
