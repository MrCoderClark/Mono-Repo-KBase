'use client';

import { useAuth } from '@/lib/auth';
import { FileText, FolderOpen, MessageSquare, ThumbsUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Articles',
      value: '12',
      description: 'Published articles',
      icon: FileText,
    },
    {
      title: 'Documents',
      value: '8',
      description: 'Uploaded files',
      icon: FolderOpen,
    },
    {
      title: 'Comments',
      value: '24',
      description: 'Total comments',
      icon: MessageSquare,
    },
    {
      title: 'Reactions',
      value: '156',
      description: 'Likes received',
      icon: ThumbsUp,
    },
  ];

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.name || 'User'}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your knowledge base activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No recent articles yet. Start by creating your first article.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No recent activity to display.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
