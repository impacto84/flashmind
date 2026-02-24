'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Sun, Moon, Search, User, X, FileText, Layers, Network, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createSupabaseBrowserClient } from '@/lib/supabase';

const supabase = createSupabaseBrowserClient();

interface SearchResult {
  type: 'document' | 'deck' | 'mindmap';
  id: string;
  title: string;
  subtitle?: string;
}

export default function Navbar() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Init theme from html class
  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDarkMode = () => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.remove('dark');
      html.classList.add('light');
    } else {
      html.classList.remove('light');
      html.classList.add('dark');
    }
    setDarkMode(!darkMode);
  };

  // Global search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      setShowResults(true);
      const searchTerm = `%${query}%`;

      const [docs, decks, maps] = await Promise.all([
        supabase.from('documents').select('id, title, updated_at').ilike('title', searchTerm).limit(5),
        supabase.from('decks').select('id, name, description').ilike('name', searchTerm).limit(5),
        supabase.from('mindmaps').select('id, title').ilike('title', searchTerm).limit(5),
      ]);

      const all: SearchResult[] = [
        ...(docs.data || []).map(d => ({
          type: 'document' as const, id: d.id, title: d.title,
          subtitle: new Date(d.updated_at).toLocaleDateString('pt-BR'),
        })),
        ...(decks.data || []).map(d => ({
          type: 'deck' as const, id: d.id, title: d.name,
          subtitle: d.description || 'Baralho',
        })),
        ...(maps.data || []).map(d => ({
          type: 'mindmap' as const, id: d.id, title: d.title,
          subtitle: 'Mapa mental',
        })),
      ];
      setResults(all);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const input = searchRef.current?.querySelector('input');
        input?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const navigateToResult = (result: SearchResult) => {
    setShowResults(false);
    setQuery('');
    switch (result.type) {
      case 'document': router.push(`/documents/${result.id}`); break;
      case 'deck': router.push(`/flashcards`); break;
      case 'mindmap': router.push(`/mindmaps`); break;
    }
  };

  const iconForType = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="h-4 w-4 text-blue-400" />;
      case 'deck': return <Layers className="h-4 w-4 text-purple-400" />;
      case 'mindmap': return <Network className="h-4 w-4 text-green-400" />;
    }
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-muted/30 px-6 lg:h-[60px]">
      {/* Global search */}
      <div className="w-full flex-1" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length >= 2 && setShowResults(true)}
            placeholder="Buscar documentos, baralhos, mapas... (Ctrl+K)"
            className="w-full appearance-none bg-background pl-8 pr-8 shadow-none md:w-2/3 lg:w-1/3"
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setShowResults(false); }}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Search results dropdown */}
          {showResults && (
            <div className="absolute top-full mt-1 w-full md:w-2/3 lg:w-1/3 bg-popover border border-border rounded-lg shadow-xl z-50 overflow-hidden">
              {searching ? (
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando...
                </div>
              ) : results.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  Nenhum resultado encontrado
                </div>
              ) : (
                <ul className="max-h-64 overflow-y-auto py-1">
                  {results.map((r) => (
                    <li key={`${r.type}-${r.id}`}>
                      <button
                        onClick={() => navigateToResult(r)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent text-left transition-colors"
                      >
                        {iconForType(r.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{r.title}</p>
                          {r.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                          )}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dark mode toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="w-8 h-8 rounded-full"
        onClick={toggleDarkMode}
        title={darkMode ? 'Modo claro' : 'Modo escuro'}
      >
        {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      {/* User */}
      <Button variant="secondary" size="icon" className="rounded-full" onClick={() => router.push('/settings')}>
        <User className="h-5 w-5" />
        <span className="sr-only">Configurações</span>
      </Button>
    </header>
  );
}
