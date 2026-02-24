'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus, Trash2, Network, Loader2, Sparkles, ArrowLeft
} from 'lucide-react';
import type { MindMap, MindMapNode } from '@/types/database';

const supabase = createSupabaseBrowserClient();

// ==========================================
// Simple Mind Map Renderer (SVG)
// ==========================================
function MindMapView({ data, className }: { data: MindMapNode; className?: string }) {
  const NODE_COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];

  const renderNode = (node: MindMapNode, x: number, y: number, level: number, angle: number, spread: number): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    const color = NODE_COLORS[level % NODE_COLORS.length];
    const radius = level === 0 ? 50 : 35;
    const fontSize = level === 0 ? 12 : 10;

    elements.push(
      <g key={`node-${node.id}`}>
        <circle cx={x} cy={y} r={radius} fill={color} opacity={0.2} stroke={color} strokeWidth={2} />
        <foreignObject x={x - radius + 5} y={y - radius / 2} width={radius * 2 - 10} height={radius}>
          <div style={{ fontSize, color: 'white', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', lineHeight: 1.2 }}>
            {node.label.length > 30 ? node.label.slice(0, 30) + '...' : node.label}
          </div>
        </foreignObject>
      </g>
    );

    if (node.children && node.children.length > 0) {
      const childSpread = spread / Math.max(node.children.length - 1, 1);
      const startAngle = angle - spread / 2;
      const distance = 120 + level * 20;

      node.children.forEach((child, i) => {
        const childAngle = node.children.length === 1
          ? angle
          : startAngle + childSpread * i;
        const childX = x + Math.cos(childAngle) * distance;
        const childY = y + Math.sin(childAngle) * distance;

        elements.push(
          <line
            key={`line-${node.id}-${child.id}`}
            x1={x} y1={y} x2={childX} y2={childY}
            stroke={NODE_COLORS[(level + 1) % NODE_COLORS.length]}
            strokeWidth={2}
            opacity={0.4}
          />
        );

        elements.push(...renderNode(child, childX, childY, level + 1, childAngle, spread * 0.6));
      });
    }

    return elements;
  };

  return (
    <div className={className}>
      <svg viewBox="-400 -300 800 600" className="w-full h-full">
        {renderNode(data, 0, 0, 0, 0, Math.PI * 1.8)}
      </svg>
    </div>
  );
}

// ==========================================
// Main Page
// ==========================================
export default function MindMapsPage() {
  const router = useRouter();
  const [mindmaps, setMindmaps] = useState<MindMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [selectedMap, setSelectedMap] = useState<MindMap | null>(null);

  const fetchMaps = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('mindmaps')
      .select('*')
      .order('updated_at', { ascending: false });
    if (data) setMindmaps(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMaps(); }, [fetchMaps]);

  const createMindMap = async () => {
    if (!newTitle.trim()) return;
    setGenerating(true);

    let mapData: MindMapNode = {
      id: 'root',
      label: newTitle,
      children: [],
    };

    // If content provided, use AI to generate
    if (newContent.trim()) {
      try {
        const response = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generate_mindmap',
            content: newContent.slice(0, 3000),
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.id) mapData = data;
        }
      } catch (err) {
        console.error('AI mindmap generation failed:', err);
      }
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setGenerating(false); return; }

    const { data, error } = await supabase
      .from('mindmaps')
      .insert({ user_id: user.id, title: newTitle.trim(), data: mapData })
      .select()
      .single();

    if (!error && data) {
      setMindmaps(prev => [data, ...prev]);
      setCreating(false);
      setNewTitle('');
      setNewContent('');
      setSelectedMap(data);
    }
    setGenerating(false);
  };

  const deleteMap = async (id: string) => {
    await supabase.from('mindmaps').delete().eq('id', id);
    setMindmaps(prev => prev.filter(m => m.id !== id));
    if (selectedMap?.id === id) setSelectedMap(null);
  };

  // Detail view
  if (selectedMap) {
    return (
      <MainLayout>
        <div className="space-y-4 h-full">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setSelectedMap(null)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h2 className="text-xl font-bold">{selectedMap.title}</h2>
            <div />
          </div>
          <Card className="flex-1">
            <CardContent className="p-4 h-[70vh]">
              <MindMapView data={selectedMap.data as MindMapNode} className="w-full h-full" />
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mapas Mentais</h1>
            <p className="text-muted-foreground">
              Visualize seus conhecimentos de forma interativa
            </p>
          </div>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Mapa
          </Button>
        </div>

        {creating && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Input
                placeholder="Título do mapa mental..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
              />
              <textarea
                placeholder="Cole aqui o conteúdo do estudo para gerar o mapa com IA (opcional)..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[100px] resize-none"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={createMindMap} disabled={generating}>
                  {generating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : newContent.trim() ? (
                    <Sparkles className="h-4 w-4 mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  {newContent.trim() ? 'Gerar com IA' : 'Criar'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mindmaps.map(map => (
            <Card
              key={map.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors group"
              onClick={() => setSelectedMap(map)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Network className="h-5 w-5 text-primary" />
                    {map.title}
                  </CardTitle>
                  <Button
                    variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); deleteMap(map.id); }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-32 rounded-md bg-muted/50 overflow-hidden">
                  <MindMapView data={map.data as MindMapNode} className="w-full h-full opacity-70" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(map.updated_at).toLocaleDateString('pt-BR')}
                </p>
              </CardContent>
            </Card>
          ))}

          {!loading && mindmaps.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum mapa mental</p>
              <p className="text-sm">Crie um mapa para visualizar seus estudos</p>
              <Button className="mt-4" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Mapa
              </Button>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
