create table if not exists rooms (
  id bigserial primary key,
  name text not null,
  created_at timestamptz not null default now()
);

