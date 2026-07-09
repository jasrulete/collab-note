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
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Get logged-in user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? 'User');
      }
    });

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('You must be logged in to create a note.');
      setCreating(false);
      return;
    }

    const { data, error } = await supabase
      .from('notes')
      .insert({ title: 'Untitled Note', content: '', user_id: user.id })
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
      alert(`Failed to create note: ${error.message}`);
    } else if (data) {
      router.push(`/note/${data.id}`);
    }
    setCreating(false);
  }

  async function deleteNote(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    await supabase.from('notes').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      {/* Header bar with user profile & logout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-800 pb-6 mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">CollabNotes</h1>
          <p className="text-gray-400 text-sm mt-1">Real-time collaborative editing</p>
        </div>

        {userEmail && (
          <div className="flex items-center gap-3.5 self-start sm:self-center">
            <span className="text-xs text-gray-400 bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-full">
              Logged in as <strong className="text-gray-200">{userEmail}</strong>
            </span>
            <button
              onClick={handleSignOut}
              className="text-xs font-semibold text-red-400 hover:text-red-300 hover:underline transition-all"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>

      {/* Action and list */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-semibold text-gray-200">Your Notes</h2>
        <button
          onClick={createNote}
          disabled={creating}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-500/10 transition-all disabled:opacity-50 cursor-pointer"
        >
          {creating ? 'Creating…' : '+ New Note'}
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500 text-center py-16">Loading your notes…</div>
      ) : notes.length === 0 ? (
        <div className="text-center py-16 bg-gray-900/50 border border-dashed border-gray-800 rounded-2xl">
          <p className="text-gray-400 mb-4">No notes yet.</p>
          <button onClick={createNote} className="text-blue-400 hover:text-blue-300 underline text-sm font-medium">
            Create your first note
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {notes.map(note => (
            <li
              key={note.id}
              onClick={() => router.push(`/note/${note.id}`)}
              className="group flex items-center justify-between p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 cursor-pointer transition-all"
            >
              <div>
                <p className="font-semibold text-white group-hover:text-blue-400 transition-colors">{note.title || 'Untitled'}</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {new Date(note.updated_at).toLocaleString()} · v{note.version}
                </p>
              </div>
              <button
                onClick={(e) => deleteNote(note.id, e)}
                className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-sm px-2 py-1 rounded"
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