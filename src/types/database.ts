// ==========================================
// FlashMind Database Types
// ==========================================

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  icon: string | null;
  color: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  content: string; // JSON (TipTap/ProseMirror or Markdown)
  summary: string | null;
  is_favorite: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Flashcard {
  id: string;
  user_id: string;
  document_id: string | null;
  deck_id: string;
  front: string;
  back: string;
  // Spaced Repetition (SM-2 algorithm)
  ease_factor: number; // default 2.5
  interval: number; // days until next review
  repetitions: number;
  next_review: string; // ISO date
  last_reviewed: string | null;
  created_at: string;
  updated_at: string;
}

export interface Deck {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string | null;
  card_count: number;
  due_count: number;
  created_at: string;
  updated_at: string;
}

export type FileStatus = 'uploaded' | 'processing' | 'processed' | 'error';
export type FileType = 'pdf' | 'docx' | 'txt' | 'image' | 'other';

export interface FileRecord {
  id: string;
  user_id: string;
  folder_id: string;
  name: string;
  original_name: string;
  file_type: FileType;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  extracted_text: string | null;
  summary: string | null;
  status: FileStatus;
  flashcards_generated: boolean;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface MindMap {
  id: string;
  user_id: string;
  document_id: string | null;
  title: string;
  data: MindMapNode; // JSON tree
  created_at: string;
  updated_at: string;
}

export interface MindMapNode {
  id: string;
  label: string;
  children: MindMapNode[];
  color?: string;
  notes?: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  deck_id: string | null;
  cards_reviewed: number;
  cards_correct: number;
  duration_minutes: number;
  started_at: string;
  ended_at: string | null;
}

// Review quality ratings (SM-2)
export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;
// 0 = complete blackout
// 1 = incorrect, remembered upon seeing answer
// 2 = incorrect, but answer felt familiar
// 3 = correct, with serious difficulty
// 4 = correct, with some hesitation
// 5 = perfect response
