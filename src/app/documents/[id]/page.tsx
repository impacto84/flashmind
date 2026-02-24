'use client';

import { useState, useEffect, useCallback, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import MainLayout from '@/components/layout/MainLayout';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  ArrowLeft, Save, Star, Sparkles, Loader2, Clock, FileText, Keyboard
} from 'lucide-react';
import type { Document } from '@/types/database';

// Lazy load the editor to avoid SSR issues with TipTap
const RichTextEditor = dynamic(() => import('@/components/editor/RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-border bg-card animate-pulse">
      <div className="h-10 bg-muted/30 border-b border-border" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-muted/20 rounded w-3/4" />
        <div className="h-4 bg-muted/20 rounded w-1/2" />
        <div className="h-4 bg-muted/20 rounded w-5/6" />
      </div>
    </div>
  ),
});

const supabase = createSupabaseBrowserClient();

export default function DocumentEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [doc, setDoc] = useState<Document | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [generating, setGenerating] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const contentRef = useRef(content);
  const titleRef = useRef(title);

  // Keep refs in sync
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { titleRef.current = title; }, [title]);

  useEffect(() => {
    const fetchDoc = async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        toast.error('Documento não encontrado');
        router.push('/documents');
        return;
      }
      setDoc(data);
      setTitle(data.title);
      setContent(data.content || '');
    };
    fetchDoc();
  }, [id, router]);

  // Word count from HTML content
  useEffect(() => {
    const text = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    setWordCount(text ? text.split(' ').length : 0);
  }, [content]);

  const saveDocument = useCallback(async () => {
    if (!doc) return;
    setSaving(true);
    const { error } = await supabase
      .from('documents')
      .update({
        title: titleRef.current,
        content: contentRef.current,
        updated_at: new Date().toISOString(),
      })
      .eq('id', doc.id);

    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar documento');
    } else {
      setLastSaved(new Date());
    }
  }, [doc]);

  // Auto-save every 5 seconds if content changed
  useEffect(() => {
    const timer = setTimeout(() => {
      if (doc && (titleRef.current !== doc.title || contentRef.current !== (doc.content || ''))) {
        saveDocument();
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [title, content, doc, saveDocument]);

  // Ctrl/Cmd + S global shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDocument();
        toast.success('Documento salvo!');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saveDocument]);

  const toggleFavorite = async () => {
    if (!doc) return;
    const newVal = !doc.is_favorite;
    const { error } = await supabase.from('documents').update({ is_favorite: newVal }).eq('id', doc.id);
    if (!error) {
      setDoc({ ...doc, is_favorite: newVal });
      toast.success(newVal ? 'Adicionado aos favoritos' : 'Removido dos favoritos');
    }
  };

  const generateFlashcards = async () => {
    if (!content.trim()) {
      toast.warning('Escreva algum conteúdo antes de gerar flashcards');
      return;
    }
    setGenerating(true);
    await saveDocument();
    toast.info('Redirecionando para geração de flashcards...');
    router.push(`/flashcards/create?document_id=${doc?.id}`);
  };

  if (!doc) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-9 w-20 bg-muted/30 rounded" />
            <div className="flex gap-2">
              <div className="h-9 w-9 bg-muted/30 rounded" />
              <div className="h-9 w-40 bg-muted/30 rounded" />
              <div className="h-9 w-24 bg-muted/30 rounded" />
            </div>
          </div>
          <div className="h-10 bg-muted/20 rounded w-2/3" />
          <div className="rounded-lg border border-border bg-card">
            <div className="h-10 bg-muted/30 border-b border-border" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-muted/20 rounded w-3/4" />
              <div className="h-4 bg-muted/20 rounded w-1/2" />
              <div className="h-4 bg-muted/20 rounded w-5/6" />
              <div className="h-4 bg-muted/20 rounded w-2/3" />
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => router.push('/documents')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Salvo {lastSaved.toLocaleTimeString('pt-BR')}
              </span>
            )}
            <Button variant="ghost" size="icon" onClick={toggleFavorite} title="Favorito">
              <Star className={`h-4 w-4 ${doc.is_favorite ? 'text-yellow-500 fill-yellow-500' : ''}`} />
            </Button>
            <Button variant="outline" size="sm" onClick={generateFlashcards} disabled={generating}>
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Gerar Flashcards com IA
            </Button>
            <Button size="sm" onClick={() => { saveDocument(); toast.success('Documento salvo!'); }} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </div>

        {/* Title */}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título do documento..."
          className="text-2xl font-bold border-none bg-transparent focus-visible:ring-0 px-0 h-auto"
        />

        {/* Rich Text Editor */}
        <RichTextEditor
          content={content}
          onChange={setContent}
          placeholder="Comece a escrever suas notas aqui..."
        />

        {/* Status bar */}
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {wordCount} palavras
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Keyboard className="h-3 w-3" />
            Ctrl+S para salvar
          </span>
        </div>
      </div>
    </MainLayout>
  );
}
