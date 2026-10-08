-- Only the two verified Google accounts may access app data.
-- auth.users is authoritative; editable user_metadata is never trusted.
create or replace function public.is_allowed_google_user() returns boolean
language sql stable security definer set search_path='' as $$
 select exists (
   select 1 from auth.users u
   where u.id=auth.uid() and u.is_anonymous is false
     and u.email_confirmed_at is not null
     and u.raw_app_meta_data->>'provider'='google'
     and lower(u.email) in ('mrayandika.work@gmail.com','anggun.rizkye@gmail.com')
 )
$$;
revoke all on function public.is_allowed_google_user() from public,anon;
grant execute on function public.is_allowed_google_user() to authenticated;

-- Restrictive policies AND with existing ownership/pairing policies.
do $$
declare tbl text;
begin
 foreach tbl in array array['profiles','couples','couple_members','meals','weight_logs','cheers','favorites'] loop
   execute format('create policy google_allowlist on public.%I as restrictive for all to authenticated using ((select public.is_allowed_google_user())) with check ((select public.is_allowed_google_user()))', tbl);
 end loop;
end $$;
create policy diet_yuk_google_allowlist on storage.objects as restrictive
 for all to authenticated
 using (bucket_id <> 'meal-photos' or (select public.is_allowed_google_user()))
 with check (bucket_id <> 'meal-photos' or (select public.is_allowed_google_user()));

-- Optional Auth hook: enable Before User Created in the Supabase dashboard.
create or replace function public.before_user_created(event jsonb) returns jsonb
language plpgsql set search_path='' as $$
begin
 if coalesce(event->'user'->'app_metadata'->>'provider','') <> 'google'
    or coalesce(lower(event->'user'->>'email'),'') not in
       ('mrayandika.work@gmail.com','anggun.rizkye@gmail.com') then
   return jsonb_build_object('error',jsonb_build_object('http_code',403,
     'message','Akses hanya untuk akun Google Raka dan Anggun yang terdaftar.'));
 end if;
 return '{}'::jsonb;
end $$;
revoke all on function public.before_user_created(jsonb) from public,anon,authenticated;
grant execute on function public.before_user_created(jsonb) to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;

-- SECURITY DEFINER RPCs bypass RLS: guard each entry point too.

create or replace function public.my_couple_id() returns uuid
language sql stable security definer set search_path='' as $$
 select couple_id from public.couple_members where user_id=auth.uid() and public.is_allowed_google_user()
$$;

create or replace function public.is_me_or_partner(uid uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select public.is_allowed_google_user() and auth.uid() is not null and (uid=auth.uid() or exists(select 1 from public.couple_members where user_id=uid and couple_id=public.my_couple_id()))
$$;

create or replace function public.create_couple(wedding date default '2027-09-26') returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not public.is_allowed_google_user() then raise exception 'Akses ditolak' using errcode='42501'; end if;
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
 if not public.is_allowed_google_user() then raise exception 'Akses ditolak' using errcode='42501'; end if;
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

create or replace function public.couple_summary() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c public.couples; p public.profiles; calories numeric;
begin
 if not public.is_allowed_google_user() then raise exception 'Akses ditolak' using errcode='42501'; end if;
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
 if not public.is_allowed_google_user() then raise exception 'Akses ditolak' using errcode='42501'; end if;
 select user_id into partner from public.couple_members where couple_id=public.my_couple_id() and user_id<>auth.uid();
 if partner is null then raise exception 'Pasangan belum bergabung'; end if;
 if exists(select 1 from public.cheers where from_user=auth.uid() and created_at>now()-interval '5 seconds') then raise exception 'Tunggu sebentar sebelum mengirim lagi'; end if;
 insert into public.cheers(from_user,to_user,emoji) values(auth.uid(),partner,emoji);
end $$;
