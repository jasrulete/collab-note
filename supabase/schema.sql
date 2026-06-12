-- Create notes table
create table notes (
  id uuid default gen_random_uuid() primary key,
  title text not null default 'Untitled Note',
  content text not null default '',
  version integer not null default 1,
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (Row Level Security)
alter table notes enable row level security;

-- Create policies for user-specific access
create policy "Users can perform all actions on their own notes" on notes
  for all using (auth.uid() = user_id);

-- Enable realtime publication for the notes table
alter publication supabase_realtime add table notes;

-- Auto-update updated_at on modify
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_notes_updated_at
  before update on notes
  for each row
  execute function update_updated_at_column();
