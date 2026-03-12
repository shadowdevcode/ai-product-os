-- schema.sql
-- Table Definition for PM Tasks

CREATE TYPE task_category AS ENUM ('unblock', 'strategy', 'stakeholders', 'ops');
CREATE TYPE task_priority AS ENUM ('high', 'medium', 'low');
CREATE TYPE task_status AS ENUM ('todo', 'done');

CREATE TABLE tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    -- user_id UUID REFERENCES auth.users(id), -- Add later if auth is implemented
    raw_input TEXT NOT NULL,
    title TEXT NOT NULL,
    category task_category NOT NULL,
    priority task_priority NOT NULL,
    status task_status DEFAULT 'todo' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Row Level Security) - disabled for MVP to keep it simple, or enabled if auth is used.
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
