'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Note } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data) setNotes(data);
    setLoading(false);
  }

  async function createNote() {
    setCreating(true);
    const { data, error } = await supabase
      .from('notes')
      .insert({ title: 'Untitled Note', content: '' })
      .select()
      .single();

    if (!error && data) {
      router.push(`/note/${data.id}`);
    }
    setCreating(false);
  }

  async function deleteNote(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await supabase.from('notes').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white">CollabNotes</h1>
          <p className="text-gray-400 text-sm mt-1">Real-time collaborative editing</p>
        </div>
        <button
          onClick={createNote}
          disabled={creating}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {creating ? 'Creating…' : '+ New Note'}
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500 text-center py-16">Loading…</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 mb-4">No notes yet.</p>
          <button onClick={createNote} className="text-blue-400 hover:text-blue-300 underline text-sm">
            Create your first note
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {notes.map(note => (
            <li
              key={note.id}
              onClick={() => router.push(`/note/${note.id}`)}
              className="group flex items-center justify-between p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-600 cursor-pointer transition-all"
            >
              <div>
                <p className="font-medium text-white">{note.title || 'Untitled'}</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {new Date(note.updated_at).toLocaleString()} · v{note.version}
                </p>
              </div>
              <button
                onClick={(e) => deleteNote(note.id, e)}
                className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-sm"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}