'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, FileText, File, FileSpreadsheet, Calendar, User } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Document {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
  tags: Array<{
    tag: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
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

export default function DocumentDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: document, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      const response = await api.get<{ document: Document }>(`/documents/${id}`);
      return response.data?.document;
    },
  });

  const handleDownload = async () => {
    const response = await api.get<{ downloadUrl: string }>(`/documents/${id}/download`);
    if (response.success && response.data?.downloadUrl) {
      window.open(response.data.downloadUrl, '_blank');
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8 max-w-2xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="container py-8 max-w-2xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Document not found</p>
            <Link href="/documents">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Documents
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const FileIcon = getFileIcon(document.mimeType);

  return (
    <div className="container py-8 max-w-2xl">
      <Link
        href="/documents"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Documents
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start space-x-4">
            <div className="p-4 bg-primary/10 rounded-lg">
              <FileIcon className="h-12 w-12 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl">{document.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {document.fileName}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {document.description && (
            <div>
              <h3 className="text-sm font-medium mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">{document.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium mb-1">File Size</h3>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(document.fileSize)}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-1">File Type</h3>
              <p className="text-sm text-muted-foreground">{document.mimeType}</p>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
            <div className="flex items-center">
              <User className="mr-1 h-4 w-4" />
              {document.uploadedBy.name}
            </div>
            <div className="flex items-center">
              <Calendar className="mr-1 h-4 w-4" />
              {new Date(document.createdAt).toLocaleDateString()}
            </div>
          </div>

          {document.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {document.tags.map(({ tag }) => (
                  <span
                    key={tag.id}
                    className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <Button onClick={handleDownload} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            Download File
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
