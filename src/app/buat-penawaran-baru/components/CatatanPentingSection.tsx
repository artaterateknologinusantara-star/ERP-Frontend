'use client';

import React from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import type { NoteItem } from '@/types';

interface Props {
  notes: NoteItem[];
  onChange: (notes: NoteItem[]) => void;
}

export default function CatatanPentingSection({ notes, onChange }: Props) {
  const addNote = () => {
    onChange([...notes, { id: `note-imp-${Date.now()}`, text: '' }]);
  };

  const updateNote = (id: string, text: string) => {
    onChange(notes.map((n) => (n.id === id ? { ...n, text } : n)));
  };

  const deleteNote = (id: string) => {
    onChange(notes.filter((n) => n.id !== id));
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
        <h3 className="text-base font-700 text-amber-800">Catatan Penting</h3>
      </div>
      <div className="space-y-2 mb-3">
        {notes.map((note, i) => (
          <div key={note.id} className="flex items-start gap-2 group/note">
            <span className="text-xs font-700 text-amber-600 mt-2 flex-shrink-0 w-5 text-center">{i + 1}.</span>
            <input
              type="text"
              value={note.text}
              onChange={(e) => updateNote(note.id, e.target.value)}
              className="flex-1 bg-white border border-amber-200 rounded-md px-3 py-1.5 text-base text-amber-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
              placeholder="Tambahkan catatan penting..."
            />
            <button
              onClick={() => deleteNote(note.id)}
              className="p-1.5 rounded hover:bg-amber-100 text-amber-400 hover:text-amber-700 transition-colors opacity-0 group-hover/note:opacity-100 mt-0.5"
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addNote}
        className="flex items-center gap-1.5 text-base font-600 text-amber-700 hover:text-amber-900 transition-colors"
      >
        <Plus size={14} /> Tambah Catatan Penting
      </button>
    </div>
  );
}
