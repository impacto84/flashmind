'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { useFolders } from '@/hooks/useSupabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  FolderOpen, Plus, Search, Trash2, MoreHorizontal,
  Clock, Pencil
} from 'lucide-react';

export default function FoldersPage() {
  const router = useRouter();
  const { folders, loading, createFolder, deleteFolder } = useFolders();
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const filteredFolders = folders.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const folder = await createFolder(newName.trim());
    if (folder) {
      toast.success(`Pasta "${folder.name}" criada!`);
      setNewName('');
      setShowNew(false);
    } else {
      toast.error('Erro ao criar pasta');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (confirm(`Excluir a pasta "${name}" e todos os arquivos dentro dela?`)) {
      await deleteFolder(id);
      toast.success('Pasta excluída');
    }
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
            <h1 className="text-3xl font-bold tracking-tight">Pastas</h1>
            <p className="text-muted-foreground">
              Organize seus materiais de estudo em pastas
            </p>
          </div>
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Pasta
          </Button>
        </div>

        {showNew && (
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Nome da pasta..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
              className="max-w-xs"
            />
            <Button size="sm" onClick={handleCreate}>Criar</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowNew(false); setNewName(''); }}>
              Cancelar
            </Button>
          </div>
        )}

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pastas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredFolders.map(folder => (
            <Card
              key={folder.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors group"
              onClick={() => router.push(`/folders/${folder.id}`)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">{folder.icon || '📁'}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{folder.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(folder.created_at)}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDelete(e, folder.id, folder.name)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {!loading && filteredFolders.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma pasta encontrada</p>
            <p className="text-sm">Crie sua primeira pasta para organizar seus materiais</p>
            <Button className="mt-4" onClick={() => setShowNew(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar pasta
            </Button>
          </div>
        )}

        {loading && (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-muted/20 rounded-lg border border-border animate-pulse" />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
