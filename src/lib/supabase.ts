import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SUPABASE_MIGRATIONS = `
-- profiles
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  avatar_url text,
  language text default 'ro',
  currency text default 'GBP',
  theme text default 'dark',
  subscription_status text default 'trial',
  trial_start timestamptz,
  trial_end timestamptz,
  stripe_customer_id text,
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can manage own profile"
  on profiles for all using (auth.uid() = id);

-- tasks
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  completed boolean default false,
  category text default 'personal',
  priority text default 'medium',
  created_at timestamptz default now()
);
alter table tasks enable row level security;
create policy "Users manage own tasks"
  on tasks for all using (auth.uid() = user_id);

-- events
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  date date not null,
  time text,
  category text,
  color text default '#E91E8C',
  created_at timestamptz default now()
);
alter table events enable row level security;
create policy "Users manage own events"
  on events for all using (auth.uid() = user_id);

-- kids
create table if not exists kids (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  birthdate date not null,
  avatar text,
  notes text,
  created_at timestamptz default now()
);
alter table kids enable row level security;
create policy "Users manage own kids"
  on kids for all using (auth.uid() = user_id);

-- kid_milestones
create table if not exists kid_milestones (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid references kids(id) on delete cascade,
  title text not null,
  date date not null,
  category text default 'activity',
  notes text
);
alter table kid_milestones enable row level security;
create policy "Users manage own milestones"
  on kid_milestones for all
  using (kid_id in (select id from kids where user_id = auth.uid()));

-- shopping_items
create table if not exists shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  quantity numeric,
  unit text,
  checked boolean default false,
  list_name text default 'Shopping',
  created_at timestamptz default now()
);
alter table shopping_items enable row level security;
create policy "Users manage own shopping"
  on shopping_items for all using (auth.uid() = user_id);

-- budget_transactions
create table if not exists budget_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  amount numeric not null,
  currency text default 'GBP',
  category text default 'other',
  type text not null,
  description text,
  date date not null,
  created_at timestamptz default now()
);
alter table budget_transactions enable row level security;
create policy "Users manage own budget"
  on budget_transactions for all using (auth.uid() = user_id);

-- selfcare_entries
create table if not exists selfcare_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text not null,
  value numeric,
  notes text,
  date date not null,
  created_at timestamptz default now()
);
alter table selfcare_entries enable row level security;
create policy "Users manage own selfcare"
  on selfcare_entries for all using (auth.uid() = user_id);
`;
