do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'rooms_name_unique'
  ) then
    alter table rooms
      add constraint rooms_name_unique unique (name);
  end if;
end $$;

