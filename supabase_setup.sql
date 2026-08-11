-- 1. Enable the pgvector extension to work with embeddings
create extension if not exists vector;

-- 2. Create the Lost Items table
create table if not exists public.lost_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users not null,
  description text not null,
  text_embedding vector(512) not null, -- Xenova/clip-vit-base-patch32 outputs 512-dimensional vectors
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Create the Found Items table
create table if not exists public.found_items (
  id uuid primary key default gen_random_uuid(),
  finder_id uuid references auth.users not null,
  image_url text not null,
  image_embedding vector(512) not null, -- Xenova/clip-vit-base-patch32 outputs 512-dimensional vectors
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create the Notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references auth.users not null,
  lost_item_id uuid references public.lost_items(id) not null,
  found_item_id uuid references public.found_items(id) not null,
  similarity float not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Enable Row Level Security (RLS)
alter table public.lost_items enable row level security;
alter table public.found_items enable row level security;
alter table public.notifications enable row level security;

-- 6. Define RLS Policies
-- Users can insert and read their own lost items
create policy "Users can insert their own lost items" on public.lost_items for insert with check (auth.uid() = owner_id);
create policy "Users can read their own lost items" on public.lost_items for select using (auth.uid() = owner_id);

-- Users can insert and read their own found items
create policy "Users can insert their own found items" on public.found_items for insert with check (auth.uid() = finder_id);
create policy "Users can read their own found items" on public.found_items for select using (auth.uid() = finder_id);

-- Anyone can read found items (needed for displaying matches)
create policy "Anyone can read found items" on public.found_items for select using (true);
create policy "Anyone can read lost items" on public.lost_items for select using (true);

-- Users can read their own notifications
create policy "Users can read their own notifications" on public.notifications for select using (auth.uid() = account_id);
create policy "System can insert notifications" on public.notifications for insert with check (true);

-- 7. Add HNSW Indexes for fast approximate nearest neighbor search
create index on public.lost_items using hnsw (text_embedding vector_cosine_ops);
create index on public.found_items using hnsw (image_embedding vector_cosine_ops);

-- 8. Create Semantic Search RPC Functions
-- Function to find lost items that match a found item's image embedding
create or replace function match_lost_items (
  query_embedding vector(512),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  description text,
  similarity float,
  owner_id uuid,
  created_at timestamp with time zone
)
language plpgsql
as $$
begin
  return query
  select
    li.id,
    li.description,
    1 - (li.text_embedding <=> query_embedding) as similarity,
    li.owner_id,
    li.created_at
  from public.lost_items li
  where 1 - (li.text_embedding <=> query_embedding) > match_threshold
  order by li.text_embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Function to find found items that match a lost item's text embedding
create or replace function match_found_items (
  query_embedding vector(512),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  image_url text,
  similarity float,
  created_at timestamp with time zone
)
language plpgsql
as $$
begin
  return query
  select
    fi.id,
    fi.image_url,
    1 - (fi.image_embedding <=> query_embedding) as similarity,
    fi.created_at
  from public.found_items fi
  where 1 - (fi.image_embedding <=> query_embedding) > match_threshold
  order by fi.image_embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 9. Trigger for Real-Time Match Notifications
-- When a new found item is added, check for matches and insert into notifications
create or replace function notify_match_on_found_item()
returns trigger as $$
declare
  match_record record;
begin
  for match_record in
    select * from match_lost_items(NEW.image_embedding, 0.75, 5)
  loop
    insert into public.notifications (account_id, lost_item_id, found_item_id, similarity)
    values (match_record.owner_id, match_record.id, NEW.id, match_record.similarity);
  end loop;
  return NEW;
end;
$$ language plpgsql;

create trigger tr_notify_match_on_found_item
after insert on public.found_items
for each row
execute function notify_match_on_found_item();
