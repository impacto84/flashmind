'use client';

import { useEffect, useState, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import type { Document, Folder, Deck, Flashcard, MindMap } from '@/types/database';

const supabase = createSupabaseBrowserClient();

// ==========================================
// Auth Hook
// ==========================================
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, loading, signOut };
}

// ==========================================
// Documents Hook
// ==========================================
export function useDocuments(folderId?: string | null) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('documents')
      .select('*')
      .order('updated_at', { ascending: false });

    if (folderId) {
      query = query.eq('folder_id', folderId);
    } else if (folderId === null) {
      query = query.is('folder_id', null);
    }

    const { data, error } = await query;
    if (!error && data) setDocuments(data);
    setLoading(false);
  }, [folderId]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const createDocument = async (title: string, folderId?: string | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('documents')
      .insert({ user_id: user.id, title, folder_id: folderId || null, content: '' })
      .select()
      .single();

    if (!error && data) {
      setDocuments(prev => [data, ...prev]);
      return data;
    }
    return null;
  };

  const updateDocument = async (id: string, updates: Partial<Document>) => {
    const { error } = await supabase
      .from('documents')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    }
  };

  const deleteDocument = async (id: string) => {
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (!error) {
      setDocuments(prev => prev.filter(d => d.id !== id));
    }
  };

  return { documents, loading, createDocument, updateDocument, deleteDocument, refresh: fetchDocuments };
}

// ==========================================
// Folders Hook
// ==========================================
export function useFolders() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFolders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .order('position', { ascending: true });

    if (!error && data) setFolders(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchFolders(); }, [fetchFolders]);

  const createFolder = async (name: string, parentId?: string | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('folders')
      .insert({ user_id: user.id, name, parent_id: parentId || null })
      .select()
      .single();

    if (!error && data) {
      setFolders(prev => [...prev, data]);
      return data;
    }
    return null;
  };

  return { folders, loading, createFolder, refresh: fetchFolders };
}

// ==========================================
// Decks Hook
// ==========================================
export function useDecks() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDecks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('decks')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) setDecks(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDecks(); }, [fetchDecks]);

  const createDeck = async (name: string, description?: string, color?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('decks')
      .insert({ user_id: user.id, name, description, color: color || '#6366f1' })
      .select()
      .single();

    if (!error && data) {
      setDecks(prev => [data, ...prev]);
      return data;
    }
    return null;
  };

  const deleteDeck = async (id: string) => {
    const { error } = await supabase.from('decks').delete().eq('id', id);
    if (!error) {
      setDecks(prev => prev.filter(d => d.id !== id));
    }
  };

  return { decks, loading, createDeck, deleteDeck, refresh: fetchDecks };
}

// ==========================================
// Flashcards Hook
// ==========================================
export function useFlashcards(deckId?: string) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlashcards = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('flashcards').select('*');

    if (deckId) {
      query = query.eq('deck_id', deckId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (!error && data) setFlashcards(data);
    setLoading(false);
  }, [deckId]);

  useEffect(() => { fetchFlashcards(); }, [fetchFlashcards]);

  const createFlashcard = async (front: string, back: string, deckId: string, documentId?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('flashcards')
      .insert({
        user_id: user.id,
        deck_id: deckId,
        document_id: documentId || null,
        front,
        back,
      })
      .select()
      .single();

    if (!error && data) {
      setFlashcards(prev => [data, ...prev]);
      return data;
    }
    return null;
  };

  const updateFlashcard = async (id: string, updates: Partial<Flashcard>) => {
    const { error } = await supabase.from('flashcards').update(updates).eq('id', id);
    if (!error) {
      setFlashcards(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    }
  };

  const deleteFlashcard = async (id: string) => {
    const { error } = await supabase.from('flashcards').delete().eq('id', id);
    if (!error) {
      setFlashcards(prev => prev.filter(f => f.id !== id));
    }
  };

  const getDueCards = () => {
    const now = new Date();
    return flashcards.filter(f => new Date(f.next_review) <= now);
  };

  return { flashcards, loading, createFlashcard, updateFlashcard, deleteFlashcard, getDueCards, refresh: fetchFlashcards };
}
