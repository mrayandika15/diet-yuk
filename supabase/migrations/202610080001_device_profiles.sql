-- Allow versioned photo filenames used by the client; keep ownership checks.
create or replace function public.validate_meal_items() returns trigger
language plpgsql set search_path='' as $$
declare item jsonb; field text;
begin
 for item in select * from jsonb_array_elements(new.items) loop
  if not (item ?& array['name','portion_g','calories','protein_g','carbs_g','fat_g']) then raise exception 'Item makanan tidak lengkap'; end if;
  if jsonb_typeof(item->'name')<>'string' or length(trim(item->>'name')) not between 1 and 150 then raise exception 'Nama makanan tidak valid'; end if;
  foreach field in array array['portion_g','calories','protein_g','carbs_g','fat_g'] loop
   if jsonb_typeof(item->field)<>'number' or (item->>field)::numeric<0 or (item->>field)::numeric>20000 then raise exception 'Nutrisi tidak valid'; end if;
  end loop;
  if (item->>'portion_g')::numeric<=0 or (item->>'portion_g')::numeric>10000 then raise exception 'Porsi tidak valid'; end if;
 end loop;
 if new.photo_path is not null and
    new.photo_path !~ ('^' || new.user_id::text || '/' || new.id::text || '(-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?\.jpg$')
 then raise exception 'Path foto tidak valid'; end if;
 return new;
end $$;

alter table public.profiles add constraint profile_bio
 check (not (data ? 'bio') or
   (jsonb_typeof(data->'bio') = 'string' and length(data->>'bio') <= 300));
