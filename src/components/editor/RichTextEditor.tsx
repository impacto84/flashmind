'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { useEffect, useCallback } from 'react';
import {
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare, Quote, Minus, Undo, Redo,
  Highlighter, CodeSquare
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
}

function MenuButton({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active
          ? 'bg-primary/20 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = 'Comece a escrever...',
  editable = true,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: 'bg-muted/50 rounded-lg p-4 font-mono text-sm' } },
        bulletList: { HTMLAttributes: { class: 'list-disc pl-6 space-y-1' } },
        orderedList: { HTMLAttributes: { class: 'list-decimal pl-6 space-y-1' } },
        blockquote: { HTMLAttributes: { class: 'border-l-4 border-primary/50 pl-4 italic text-muted-foreground' } },
        horizontalRule: { HTMLAttributes: { class: 'border-border my-4' } },
      }),
      Placeholder.configure({ placeholder }),
      Highlight.configure({ multicolor: false }),
      TaskList.configure({ HTMLAttributes: { class: 'space-y-1' } }),
      TaskItem.configure({ nested: true }),
    ],
    content: content || '',
    editable,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none min-h-[300px] focus:outline-none px-1 py-2 text-foreground leading-relaxed',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync content from outside
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!editor) return null;

  const iconSize = 'h-4 w-4';

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Toolbar */}
      {editable && (
        <div className="flex items-center gap-0.5 flex-wrap border-b border-border px-2 py-1.5 bg-muted/30">
          <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Título 1">
            <Heading1 className={iconSize} />
          </MenuButton>
          <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Título 2">
            <Heading2 className={iconSize} />
          </MenuButton>
          <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Título 3">
            <Heading3 className={iconSize} />
          </MenuButton>
          <div className="w-px h-5 bg-border mx-1" />
          <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrito">
            <Bold className={iconSize} />
          </MenuButton>
          <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Itálico">
            <Italic className={iconSize} />
          </MenuButton>
          <MenuButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Riscado">
            <Strikethrough className={iconSize} />
          </MenuButton>
          <MenuButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Código inline">
            <Code className={iconSize} />
          </MenuButton>
          <MenuButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive('highlight')} title="Destaque">
            <Highlighter className={iconSize} />
          </MenuButton>
          <div className="w-px h-5 bg-border mx-1" />
          <MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista">
            <List className={iconSize} />
          </MenuButton>
          <MenuButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada">
            <ListOrdered className={iconSize} />
          </MenuButton>
          <MenuButton onClick={() => editor.chain().focus().toggleTaskList().run()} active={editor.isActive('taskList')} title="Checklist">
            <CheckSquare className={iconSize} />
          </MenuButton>
          <div className="w-px h-5 bg-border mx-1" />
          <MenuButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Citação">
            <Quote className={iconSize} />
          </MenuButton>
          <MenuButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Bloco de código">
            <CodeSquare className={iconSize} />
          </MenuButton>
          <MenuButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha divisória">
            <Minus className={iconSize} />
          </MenuButton>
          <div className="flex-1" />
          <MenuButton onClick={() => editor.chain().focus().undo().run()} title="Desfazer">
            <Undo className={iconSize} />
          </MenuButton>
          <MenuButton onClick={() => editor.chain().focus().redo().run()} title="Refazer">
            <Redo className={iconSize} />
          </MenuButton>
        </div>
      )}

      {/* Editor */}
      <div className="px-4 py-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
