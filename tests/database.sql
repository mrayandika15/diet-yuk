-- Run only in an isolated test database. Supabase service contracts are stubbed here.
create schema auth;
create schema storage;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
alter table storage.objects enable row level security;
grant usage on schema public,auth,storage to authenticated,anon;
grant select,insert,update,delete on storage.objects to authenticated;
create publication supabase_realtime;
\ir ../supabase/migrations/202610060001_init.sql
\ir ../supabase/migrations/202610080001_device_profiles.sql
insert into auth.users values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002'),('00000000-0000-4000-8000-000000000003');
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
insert into public.profiles values(auth.uid(),'{"name":"Raka","sex":"male","birthDate":"1998-01-01","height":170,"weight":70,"targetWeight":65,"activity":1.375,"calorieTarget":1900,"weddingDate":"2027-09-26"}');
select public.create_couple();
select invite_code as invite from public.couples \gset
select public.save_meal('{"id":"10000000-0000-4000-8000-000000000001","date":"2026-10-06","type":"lunch","items":[{"name":"Nasi","portion_g":150,"calories":195,"protein_g":4,"carbs_g":42,"fat_g":0.5}]}');
-- An identical request is an idempotent retry.
select public.save_meal('{"id":"10000000-0000-4000-8000-000000000001","date":"2026-10-06","type":"lunch","items":[{"name":"Nasi","portion_g":150,"calories":195,"protein_g":4,"carbs_g":42,"fat_g":0.5}]}');
do $$ begin if (select count(*) from public.meals)<>1 then raise exception 'Retry duplicated meal';end if;end $$;
-- Versioned uploads are accepted, but another owner's folder is not.
update public.meals set photo_path=auth.uid()::text || '/' || id::text || '-40000000-0000-4000-8000-000000000004.jpg';
do $$ begin
 begin
  update public.meals set photo_path='00000000-0000-4000-8000-000000000002/' || id::text || '.jpg';
  raise exception 'Foreign photo folder accepted';
 exception when raise_exception then
  if sqlerrm <> 'Path foto tidak valid' then raise; end if;
 end;
 begin
  update public.profiles set data=jsonb_set(data,'{bio}',to_jsonb(repeat('x',301))) where id=auth.uid();
  raise exception 'Oversized bio accepted';
 exception when check_violation then null;
 end;
end $$;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
insert into public.profiles values(auth.uid(),'{"name":"Anggun","sex":"female","birthDate":"1998-01-01","height":160,"weight":60,"targetWeight":55,"activity":1.375,"calorieTarget":1500,"weddingDate":"2027-09-26"}');
select public.join_couple(:'invite');
do $$ begin if (select count(*) from public.meals)<>1 then raise exception 'Partner cannot read meal';end if;
 if public.couple_summary()->>'name'<>'Raka' then raise exception 'Missing partner summary';end if;
 update public.meals set note='ATTACK' where id='10000000-0000-4000-8000-000000000001';
 if found then raise exception 'Partner can modify owner meal';end if;
 begin
 perform public.save_meal('{"id":"10000000-0000-4000-8000-000000000001","date":"2026-10-06","type":"lunch","items":[{"name":"attack","portion_g":1,"calories":1,"protein_g":0,"carbs_g":0,"fat_g":0}]}');
 raise exception 'Cross-owner overwrite accepted';
 exception when insufficient_privilege then null;end;
 begin
 insert into public.couple_members(user_id,couple_id) values(auth.uid(),gen_random_uuid());
 raise exception 'Direct membership write accepted';
 exception when insufficient_privilege then null;end;
end $$;
select public.send_cheer('❤️');
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';
insert into public.profiles values(auth.uid(),'{"name":"Stranger","sex":"male","birthDate":"1998-01-01","height":170,"weight":70,"targetWeight":65,"activity":1.375,"calorieTarget":1900,"weddingDate":"2027-09-26"}');
do $$ begin
 if (select count(*) from public.meals)<>0 then raise exception 'Third user can read meals';end if;
 if (select count(*) from public.profiles)<>1 then raise exception 'Third user can read profiles';end if;
 if (select count(*) from public.cheers)<>0 then raise exception 'Third user can read cheers';end if;
 if public.couple_summary() is not null then raise exception 'Third user can read couple summary';end if;
end $$;
select set_config('test.invite', :'invite', false);
do $$ begin
 begin
 perform public.join_couple(current_setting('test.invite'));
 raise exception 'Third member accepted';
 exception when raise_exception then if sqlerrm<>'Pasangan sudah lengkap' then raise;end if;end;
 begin
 perform public.save_meal('{"id":"30000000-0000-4000-8000-000000000003","date":"2026-10-06","type":"lunch","items":[{"name":"Invalid","portion_g":0,"calories":-1,"protein_g":0,"carbs_g":0,"fat_g":0}]}');
 raise exception 'Invalid nutrition accepted';
 exception when raise_exception then if sqlerrm not in ('Nutrisi tidak valid','Porsi tidak valid') then raise;end if;end;
end $$;
reset role;
select 'Database ownership, pairing, validation, and idempotency checks passed' as result;
