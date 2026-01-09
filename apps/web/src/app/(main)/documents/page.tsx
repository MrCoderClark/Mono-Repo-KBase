'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Upload, Search, FileText, File, FileSpreadsheet } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Document {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  uploadedBy: {
    id: string;
    name: string;
  };
}

interface DocumentsResponse {
  documents: Document[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes('pdf')) return FileText;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
  return File;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { isAuthenticated } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const response = await api.get<DocumentsResponse>('/documents');
      return response.data;
    },
  });

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Browse and download shared documents
          </p>
        </div>
        {isAuthenticated && (
          <Link href="/documents/upload">
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </Link>
        )}
      </div>

      <div className="flex items-center space-x-2 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search documents..." className="pl-9" />
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
            </Card>
          ))}
        </div>
      ) : data?.documents && data.documents.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.documents.map((doc) => {
            const FileIcon = getFileIcon(doc.mimeType);
            return (
              <Link key={doc.id} href={`/documents/${doc.id}`}>
                <Card className="h-full hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-primary/10 rounded">
                        <FileIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base line-clamp-1">
                          {doc.title}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {formatFileSize(doc.fileSize)} • {doc.fileName}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {doc.description || 'No description'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Uploaded by {doc.uploadedBy.name} •{' '}
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No documents found</p>
            {isAuthenticated && (
              <Link href="/documents/upload">
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload your first document
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
