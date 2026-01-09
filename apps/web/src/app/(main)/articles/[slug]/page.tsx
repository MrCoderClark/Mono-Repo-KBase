'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Calendar, User, MessageSquare, ThumbsUp, ThumbsDown, Send } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  tags: Array<{
    tag: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
  replies: Comment[];
}

interface Reactions {
  likes: number;
  dislikes: number;
  userReaction: 'LIKE' | 'DISLIKE' | null;
}

export default function ArticleDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');

  const { data: article, isLoading: articleLoading } = useQuery({
    queryKey: ['article', slug],
    queryFn: async () => {
      const response = await api.get<{ article: Article }>(`/articles/${slug}`);
      return response.data?.article;
    },
  });

  const { data: comments } = useQuery({
    queryKey: ['comments', 'article', article?.id],
    queryFn: async () => {
      if (!article?.id) return [];
      const response = await api.get<{ comments: Comment[] }>(
        `/comments?contentType=article&contentId=${article.id}`
      );
      return response.data?.comments || [];
    },
    enabled: !!article?.id,
  });

  const { data: reactions } = useQuery({
    queryKey: ['reactions', 'article', article?.id],
    queryFn: async () => {
      if (!article?.id) return { likes: 0, dislikes: 0, userReaction: null };
      const response = await api.get<Reactions>(
        `/reactions?contentType=article&contentId=${article.id}`
      );
      return response.data || { likes: 0, dislikes: 0, userReaction: null };
    },
    enabled: !!article?.id,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return api.post('/comments', {
        contentType: 'article',
        contentId: article?.id,
        content,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', 'article', article?.id] });
      setNewComment('');
    },
  });

  const reactMutation = useMutation({
    mutationFn: async (type: 'LIKE' | 'DISLIKE') => {
      return api.post('/reactions', {
        contentType: 'article',
        contentId: article?.id,
        type,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reactions', 'article', article?.id] });
    },
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (articleLoading) {
    return (
      <div className="container py-8 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container py-8 max-w-4xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Article not found</p>
            <Link href="/articles">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Articles
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      <Link
        href="/articles"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Articles
      </Link>

      <article>
        <header className="mb-8">
          {article.category && (
            <Link
              href={`/categories/${article.category.slug}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {article.category.name}
            </Link>
          )}
          <h1 className="text-4xl font-bold tracking-tight mt-2 mb-4">
            {article.title}
          </h1>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <User className="mr-1 h-4 w-4" />
              {article.author.name}
            </div>
            <div className="flex items-center">
              <Calendar className="mr-1 h-4 w-4" />
              {new Date(article.createdAt).toLocaleDateString()}
            </div>
            <div className="flex items-center">
              <MessageSquare className="mr-1 h-4 w-4" />
              {comments?.length || 0} comments
            </div>
          </div>
          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {article.tags.map(({ tag }) => (
                <span
                  key={tag.id}
                  className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </header>

        <div className="prose prose-neutral dark:prose-invert max-w-none mb-8">
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </div>

        <div className="flex items-center space-x-4 py-4 border-t border-b mb-8">
          <Button
            variant={reactions?.userReaction === 'LIKE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => reactMutation.mutate('LIKE')}
            disabled={!isAuthenticated}
          >
            <ThumbsUp className="mr-2 h-4 w-4" />
            {reactions?.likes || 0}
          </Button>
          <Button
            variant={reactions?.userReaction === 'DISLIKE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => reactMutation.mutate('DISLIKE')}
            disabled={!isAuthenticated}
          >
            <ThumbsDown className="mr-2 h-4 w-4" />
            {reactions?.dislikes || 0}
          </Button>
        </div>
      </article>

      <section>
        <h2 className="text-2xl font-bold mb-6">Comments</h2>

        {isAuthenticated ? (
          <form onSubmit={handleSubmitComment} className="mb-6">
            <div className="flex items-start space-x-4">
              <Avatar className="h-10 w-10">
                <AvatarFallback>{user ? getInitials(user.name) : '?'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex space-x-2">
                <Input
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <Button type="submit" disabled={addCommentMutation.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <Card className="mb-6">
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground text-center">
                <Link href="/login" className="text-primary hover:underline">
                  Sign in
                </Link>{' '}
                to leave a comment
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {comments && comments.length > 0 ? (
            comments.map((comment) => (
              <Card key={comment.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{getInitials(comment.author.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{comment.author.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{comment.content}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No comments yet. Be the first to comment!
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
