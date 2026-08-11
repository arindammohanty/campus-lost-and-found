-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create users table linked to auth.users
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT
);

-- Trigger to automatically create a user profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create lost_items table
CREATE TABLE public.lost_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.users(id) NOT NULL,
  description TEXT NOT NULL,
  text_embedding vector(512),
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create found_items table
CREATE TABLE public.found_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  finder_id UUID REFERENCES public.users(id) NOT NULL,
  image_url TEXT NOT NULL,
  image_embedding vector(512),
  claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.users(id) NOT NULL,
  lost_item_id UUID REFERENCES public.lost_items(id) NOT NULL,
  found_item_id UUID REFERENCES public.found_items(id) NOT NULL,
  similarity FLOAT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW Indexes
CREATE INDEX ON public.lost_items USING hnsw (text_embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);
CREATE INDEX ON public.found_items USING hnsw (image_embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- RLS Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.found_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read all users but only modify their own
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Lost items
CREATE POLICY "Lost items are viewable by everyone" ON public.lost_items FOR SELECT USING (true);
CREATE POLICY "Users can insert own lost items" ON public.lost_items FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own lost items" ON public.lost_items FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own lost items" ON public.lost_items FOR DELETE USING (auth.uid() = owner_id);

-- Found items
CREATE POLICY "Found items are viewable by everyone" ON public.found_items FOR SELECT USING (true);
CREATE POLICY "Users can insert own found items" ON public.found_items FOR INSERT WITH CHECK (auth.uid() = finder_id);
CREATE POLICY "Users can update own found items" ON public.found_items FOR UPDATE USING (auth.uid() = finder_id);
CREATE POLICY "Users can delete own found items" ON public.found_items FOR DELETE USING (auth.uid() = finder_id);

-- Notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = account_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = account_id);

-- match_found_items RPC
CREATE OR REPLACE FUNCTION match_found_items (
  query_embedding vector(512),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  finder_id uuid,
  image_url text,
  image_embedding vector(512),
  claimed boolean,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    found_items.id,
    found_items.finder_id,
    found_items.image_url,
    found_items.image_embedding,
    found_items.claimed,
    found_items.created_at,
    1 - (found_items.image_embedding <=> query_embedding) AS similarity
  FROM found_items
  WHERE 1 - (found_items.image_embedding <=> query_embedding) > match_threshold
  ORDER BY found_items.image_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- match_lost_items RPC
CREATE OR REPLACE FUNCTION match_lost_items (
  query_embedding vector(512),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  description text,
  text_embedding vector(512),
  resolved boolean,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    lost_items.id,
    lost_items.owner_id,
    lost_items.description,
    lost_items.text_embedding,
    lost_items.resolved,
    lost_items.created_at,
    1 - (lost_items.text_embedding <=> query_embedding) AS similarity
  FROM lost_items
  WHERE 1 - (lost_items.text_embedding <=> query_embedding) > match_threshold
  ORDER BY lost_items.text_embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
