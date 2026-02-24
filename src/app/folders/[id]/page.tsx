'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { useFiles } from '@/hooks/useSupabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Upload, FileText, Trash2, Sparkles, Brain, ArrowLeft,
  File, FileImage, Loader2, CheckCircle, AlertCircle,
  ChevronDown
} from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import type { Folder } from '@/types/database';

const supabase = createSupabaseBrowserClient();

const fileTypeIcons: Record<string, typeof FileText> = {
  pdf: FileText,
  docx: FileText,
  txt: FileText,
  image: FileImage,
  other: File,
};

const statusLabels: Record<string, { label: string; color: string }> = {
  uploaded: { label: 'Enviado', color: 'text-blue-400' },
  processing: { label: 'Processando...', color: 'text-yellow-400' },
  processed: { label: 'Processado', color: 'text-green-400' },
  error: { label: 'Erro', color: 'text-red-400' },
};

export default function FolderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const folderId = params.id as string;
  const { files, loading, uploadFile, deleteFile, processFile } = useFiles(folderId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [folder, setFolder] = useState<Folder | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const fetchFolder = async () => {
      const { data } = await supabase
        .from('folders')
        .select('*')
        .eq('id', folderId)
        .single();
      if (data) setFolder(data);
    };
    fetchFolder();
  }, [folderId]);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} é muito grande (máx 20MB)`);
        continue;
      }
      const result = await uploadFile(file, folderId);
      if (result) {
        toast.success(`${file.name} enviado!`);
      } else {
        toast.error(`Erro ao enviar ${file.name}`);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleProcess = async (fileId: string, action: 'summarize' | 'flashcards' | 'both') => {
    setProcessingId(fileId);
    toast.info('Processando arquivo com IA...');
    const result = await processFile(fileId, action);
    setProcessingId(null);

    if (result) {
      if (result.summary) toast.success('Resumo gerado!');
      if (result.flashcards?.length) {
        toast.success(`${result.flashcards.length} flashcards criados!`);
      }
    } else {
      toast.error('Erro no processamento');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/folders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{folder?.icon || '📁'}</span>
              <h1 className="text-3xl font-bold tracking-tight">
                {folder?.name || 'Carregando...'}
              </h1>
            </div>
            <p className="text-muted-foreground">
              {files.length} arquivo{files.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Upload
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>

        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Arraste arquivos aqui ou{' '}
            <button
              className="text-primary underline"
              onClick={() => fileInputRef.current?.click()}
            >
              selecione do computador
            </button>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, TXT, DOC, DOCX, imagens (máx 20MB)
          </p>
        </div>

        {/* Files List */}
        <div className="space-y-3">
          {files.map(file => {
            const IconComponent = fileTypeIcons[file.file_type] || File;
            const status = statusLabels[file.status] || statusLabels.uploaded;
            const isProcessing = processingId === file.id;

            return (
              <Card key={file.id} className="group">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <IconComponent className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{file.original_name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatSize(file.size_bytes)}</span>
                        <span className={status.color}>
                          {file.status === 'processing' || isProcessing ? (
                            <span className="flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Processando...
                            </span>
                          ) : file.status === 'processed' ? (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {status.label}
                            </span>
                          ) : file.status === 'error' ? (
                            <span className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {status.label}
                            </span>
                          ) : (
                            status.label
                          )}
                        </span>
                        {file.flashcards_generated && (
                          <span className="text-purple-400">✓ Flashcards gerados</span>
                        )}
                      </div>
                      {file.summary && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {file.summary.substring(0, 150)}...
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-2">
                    {(file.file_type === 'pdf' || file.file_type === 'txt') && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => handleProcess(file.id, 'summarize')}
                          title="Gerar resumo com IA"
                        >
                          <Brain className="h-4 w-4 mr-1" />
                          Resumo
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => handleProcess(file.id, 'flashcards')}
                          title="Gerar flashcards com IA"
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          Flashcards
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100"
                      onClick={() => {
                        if (confirm('Excluir este arquivo?')) {
                          deleteFile(file.id);
                          toast.success('Arquivo excluído');
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!loading && files.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <File className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Pasta vazia</p>
            <p className="text-sm">Faça upload de PDFs e documentos para começar a estudar com IA</p>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-muted/20 rounded-lg border border-border animate-pulse" />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
