-- Create notes table
create table notes (
  id uuid default gen_random_uuid() primary key,
  title text not null default 'Untitled Note',
  content text not null default '',
  version integer not null default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (Row Level Security)
alter table notes enable row level security;

-- Create policies for public access (adjust if you introduce auth later)
create policy "Allow public read access" on notes for select using (true);
create policy "Allow public insert access" on notes for insert with check (true);
create policy "Allow public update access" on notes for update using (true);
create policy "Allow public delete access" on notes for delete using (true);

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
