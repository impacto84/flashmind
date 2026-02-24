'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { useDocuments, useFolders } from '@/hooks/useSupabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  FileText, Plus, Search, Folder, Star, MoreHorizontal,
  Clock, Trash2, FolderPlus
} from 'lucide-react';

export default function DocumentsPage() {
  const router = useRouter();
  const { documents, loading, createDocument, deleteDocument } = useDocuments();
  const { folders, createFolder } = useFolders();
  const [search, setSearch] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const filteredDocs = documents.filter(doc =>
    doc.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateDoc = async () => {
    const doc = await createDocument('Novo documento');
    if (doc) {
      toast.success('Documento criado!');
      router.push(`/documents/${doc.id}`);
    } else {
      toast.error('Erro ao criar documento');
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const folder = await createFolder(newFolderName.trim());
    if (folder) {
      toast.success(`Pasta "${folder.name}" criada!`);
    }
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Documentos</h1>
            <p className="text-muted-foreground">
              Sua biblioteca de notas e documentos de estudo
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowNewFolder(true)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Nova Pasta
            </Button>
            <Button size="sm" onClick={handleCreateDoc}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Documento
            </Button>
          </div>
        </div>

        {showNewFolder && (
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Nome da pasta..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
              className="max-w-xs"
            />
            <Button size="sm" onClick={handleCreateFolder}>Criar</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNewFolder(false)}>Cancelar</Button>
          </div>
        )}

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Folders */}
        {folders.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Pastas</h2>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
              {folders.map(folder => (
                <Card
                  key={folder.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => router.push(`/documents?folder=${folder.id}`)}
                >
                  <CardContent className="flex items-center gap-3 p-4">
                    <Folder className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium truncate">{folder.name}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Documents */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            {loading ? 'Carregando...' : `${filteredDocs.length} documento${filteredDocs.length !== 1 ? 's' : ''}`}
          </h2>
          <div className="grid gap-3">
            {filteredDocs.map(doc => (
              <Card
                key={doc.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors group"
                onClick={() => router.push(`/documents/${doc.id}`)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{doc.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(doc.updated_at)}</span>
                        {doc.summary && (
                          <span className="truncate max-w-[200px]">• {doc.summary}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {doc.is_favorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDocument(doc.id);
                        toast.success('Documento excluído');
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {!loading && filteredDocs.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhum documento encontrado</p>
                <p className="text-sm">Crie seu primeiro documento para começar a estudar</p>
                <Button className="mt-4" onClick={handleCreateDoc}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar documento
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
