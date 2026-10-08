-- diet-yuk: ownership stays in relational columns; nutrition snapshots are atomic JSON.
create table public.profiles (
 id uuid primary key references auth.users on delete cascade,
 data jsonb not null,
 created_at timestamptz not null default now(),
 constraint profile_name check (length(trim(data->>'name')) between 1 and 80),
 constraint profile_target check ((data->>'calorieTarget')::numeric between 1000 and 6000),
 constraint profile_shape check (data ?& array['name','sex','birthDate','height','weight','targetWeight','activity','calorieTarget','weddingDate'])
);
create table public.couples (
 id uuid primary key default gen_random_uuid(),
 wedding_date date not null default '2027-09-26',
 invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
 created_at timestamptz not null default now()
);
create table public.couple_members (
 user_id uuid primary key references public.profiles on delete cascade,
 couple_id uuid not null references public.couples on delete cascade,
 joined_at timestamptz not null default now()
);
create index couple_members_couple on public.couple_members(couple_id);
create table public.meals (
 id uuid primary key,
 user_id uuid not null references public.profiles on delete cascade,
 eaten_on date not null,
 meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),
 items jsonb not null check (jsonb_typeof(items)='array' and jsonb_array_length(items) between 1 and 30),
 photo_path text,
 note text not null default '' check (length(note)<=6000),
 created_at timestamptz not null default now()
);
create index meals_owner_date on public.meals(user_id,eaten_on);
create table public.weight_logs (
 user_id uuid not null references public.profiles on delete cascade,
 logged_on date not null,
 weight_kg numeric not null check (weight_kg between 30 and 350),
 primary key(user_id,logged_on)
);
create table public.cheers (
 id uuid primary key default gen_random_uuid(),
 from_user uuid not null references public.profiles on delete cascade,
 to_user uuid not null references public.profiles on delete cascade,
 emoji text not null check (emoji in ('❤️','💪','🥗','🔥')),
 created_at timestamptz not null default now()
);
create index cheers_recipient_time on public.cheers(to_user,created_at desc);
create or replace function public.my_couple_id() returns uuid
language sql stable security definer set search_path='' as $$
 select couple_id from public.couple_members where user_id=auth.uid()
$$;
create or replace function public.is_me_or_partner(uid uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (uid=auth.uid() or exists(select 1 from public.couple_members where user_id=uid and couple_id=public.my_couple_id()))
$$;
create or replace function public.create_couple(wedding date default '2027-09-26') returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if auth.uid() is null then raise exception 'Masuk terlebih dahulu'; end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 if not found then raise exception 'Simpan profil terlebih dahulu'; end if;
 if public.my_couple_id() is not null then raise exception 'Kamu sudah memiliki pasangan'; end if;
 insert into public.couples(wedding_date) values(wedding) returning id into result;
 insert into public.couple_members values(auth.uid(),result,now());
 return result;
end $$;
create or replace function public.join_couple(code text) returns uuid
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if auth.uid() is null then raise exception 'Masuk terlebih dahulu'; end if;
 perform 1 from public.profiles where id=auth.uid() for update;
 if not found then raise exception 'Simpan profil terlebih dahulu'; end if;
 if public.my_couple_id() is not null then raise exception 'Kamu sudah memiliki pasangan'; end if;
 select id into target from public.couples where invite_code=upper(trim(code)) for update;
 if target is null then raise exception 'Kode tidak ditemukan'; end if;
 if (select count(*) from public.couple_members where couple_id=target)>=2 then raise exception 'Pasangan sudah lengkap'; end if;
 insert into public.couple_members values(auth.uid(),target,now());
 return target;
end $$;
create or replace function public.set_wedding_date(wedding date) returns void
language sql security definer set search_path='' as $$
 update public.couples set wedding_date=wedding where id=public.my_couple_id()
$$;
create or replace function public.couple_summary() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c public.couples; p public.profiles; calories numeric;
begin
 select * into c from public.couples where id=public.my_couple_id();
 if c.id is null then return null; end if;
 select profiles.* into p from public.profiles profiles join public.couple_members members on members.user_id=profiles.id where members.couple_id=c.id and profiles.id<>auth.uid();
 select coalesce(sum((item->>'calories')::numeric),0) into calories from public.meals m cross join lateral jsonb_array_elements(m.items) item where m.user_id=p.id and m.eaten_on=(now() at time zone 'Asia/Jakarta')::date;
 return jsonb_build_object('name',coalesce(p.data->>'name',''),'target',coalesce((p.data->>'calorieTarget')::numeric,0),'calories',calories,'coupleId',c.id,'inviteCode',c.invite_code,'weddingDate',c.wedding_date);
end $$;
create or replace function public.send_cheer(emoji text) returns void
language plpgsql security definer set search_path='' as $$
declare partner uuid;
begin
 select user_id into partner from public.couple_members where couple_id=public.my_couple_id() and user_id<>auth.uid();
 if partner is null then raise exception 'Pasangan belum bergabung'; end if;
 if exists(select 1 from public.cheers where from_user=auth.uid() and created_at>now()-interval '5 seconds') then raise exception 'Tunggu sebentar sebelum mengirim lagi'; end if;
 insert into public.cheers(from_user,to_user,emoji) values(auth.uid(),partner,emoji);
end $$;
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
 if new.photo_path is not null and new.photo_path<>new.user_id::text||'/'||new.id::text||'.jpg' then raise exception 'Path foto tidak valid'; end if;
 return new;
end $$;
create trigger validate_meal before insert or update on public.meals for each row execute function public.validate_meal_items();
create or replace function public.save_meal(meal jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare result uuid;
begin
 if auth.uid() is null then raise exception 'Masuk terlebih dahulu'; end if;
 insert into public.meals(id,user_id,eaten_on,meal_type,items,photo_path,note)
 values((meal->>'id')::uuid,auth.uid(),(meal->>'date')::date,meal->>'type',meal->'items',meal->>'photoPath',coalesce(meal->>'note',''))
 on conflict(id) do update set eaten_on=excluded.eaten_on,meal_type=excluded.meal_type,items=excluded.items,photo_path=excluded.photo_path,note=excluded.note
 returning id into result;
 return result;
end $$;
alter table public.profiles enable row level security;
alter table public.couples enable row level security;
alter table public.couple_members enable row level security;
alter table public.meals enable row level security;
alter table public.weight_logs enable row level security;
alter table public.cheers enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(public.is_me_or_partner(id));
create policy profiles_insert on public.profiles for insert to authenticated with check(id=auth.uid());
create policy profiles_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy couples_read on public.couples for select to authenticated using(id=public.my_couple_id());
create policy members_read on public.couple_members for select to authenticated using(couple_id=public.my_couple_id());
create policy meals_read on public.meals for select to authenticated using(public.is_me_or_partner(user_id));
create policy meals_insert on public.meals for insert to authenticated with check(user_id=auth.uid());
create policy meals_update on public.meals for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy meals_delete on public.meals for delete to authenticated using(user_id=auth.uid());
create policy weights_read on public.weight_logs for select to authenticated using(public.is_me_or_partner(user_id));
create policy weights_write on public.weight_logs for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy cheers_read on public.cheers for select to authenticated using(to_user=auth.uid() or from_user=auth.uid());
-- Membership/invites and cheers mutate only through bounded RPCs.
revoke all on public.couples,public.couple_members,public.cheers from anon,authenticated;
grant select on public.couples,public.couple_members,public.cheers to authenticated;
grant select,insert,update on public.profiles to authenticated;
grant select,insert,update,delete on public.meals,public.weight_logs to authenticated;
revoke all on function public.my_couple_id(),public.is_me_or_partner(uuid),public.create_couple(date),public.join_couple(text),public.set_wedding_date(date),public.couple_summary(),public.send_cheer(text),public.save_meal(jsonb) from public,anon;
grant execute on function public.my_couple_id(),public.is_me_or_partner(uuid),public.create_couple(date),public.join_couple(text),public.set_wedding_date(date),public.couple_summary(),public.send_cheer(text),public.save_meal(jsonb) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('meal-photos','meal-photos',false,8388608,array['image/jpeg']) on conflict(id) do nothing;
create policy photos_read on storage.objects for select to authenticated using(bucket_id='meal-photos' and ((storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.meals where photo_path=name and public.is_me_or_partner(user_id))));
create policy photos_insert on storage.objects for insert to authenticated with check(bucket_id='meal-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy photos_update on storage.objects for update to authenticated using(bucket_id='meal-photos' and (storage.foldername(name))[1]=auth.uid()::text) with check(bucket_id='meal-photos' and (storage.foldername(name))[1]=auth.uid()::text);
create policy photos_delete on storage.objects for delete to authenticated using(bucket_id='meal-photos' and (storage.foldername(name))[1]=auth.uid()::text);
alter publication supabase_realtime add table public.meals,public.cheers,public.couple_members;
create table public.favorites (
 user_id uuid not null references public.profiles on delete cascade,
 name text not null check(length(name) between 1 and 150),
 food jsonb not null check(jsonb_typeof(food)='object'),
 primary key(user_id,name)
);
alter table public.favorites enable row level security;
create policy favorites_owner on public.favorites for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update,delete on public.favorites to authenticated;
