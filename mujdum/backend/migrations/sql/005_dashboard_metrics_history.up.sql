create table if not exists dashboard_metrics_history (
  id bigserial primary key,
  key text not null,
  value jsonb not null,
  numeric_value double precision null,
  created_at timestamptz not null default now()
);

create index if not exists dashboard_metrics_history_key_created_at_idx
  on dashboard_metrics_history (key, created_at desc);

