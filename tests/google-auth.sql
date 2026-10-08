-- Existing fixtures intentionally predate the allowlist, like legacy sessions.
\ir ../supabase/migrations/202610080002_google_allowlist.sql
update auth.users set email=case right(id::text,1) when '1' then 'mrayandika.work@gmail.com' when '2' then 'anggun.rizkye@gmail.com' else 'stranger@gmail.com' end,
 email_confirmed_at=now(), raw_app_meta_data='{"provider":"google"}';
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
do $$ begin
 if not public.is_allowed_google_user() then raise exception 'Raka rejected'; end if;
 if (select count(*) from public.meals)<>1 then raise exception 'Owner cannot read'; end if;
 update public.profiles set data=jsonb_set(data,'{bio}','"Google login"') where id=auth.uid();
 if not found then raise exception 'Owner cannot update'; end if;
end $$;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
do $$ begin
 if not public.is_allowed_google_user() then raise exception 'Anggun rejected'; end if;
 if (select count(*) from public.meals)<>1 then raise exception 'Partner cannot read'; end if;
end $$;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';
do $$ begin
 if public.is_allowed_google_user() then raise exception 'Stranger accepted'; end if;
 if (select count(*) from public.profiles)<>0 then raise exception 'Stranger can read own legacy data'; end if;
 if public.my_couple_id() is not null then raise exception 'Stranger can read couple'; end if;
 begin
  perform public.create_couple(); raise exception 'RPC bypass';
 exception when insufficient_privilege then null; end;
 begin
  perform public.couple_summary(); raise exception 'Summary bypass';
 exception when insufficient_privilege then null; end;
 begin
  perform public.join_couple('ABCDEF'); raise exception 'Join bypass';
 exception when insufficient_privilege then null; end;
 begin
  perform public.send_cheer('❤️'); raise exception 'Cheer bypass';
 exception when insufficient_privilege then null; end;
 begin
  insert into public.weight_logs(user_id,logged_on,weight_kg) values(auth.uid(),current_date,70);
  raise exception 'Direct write bypass';
 exception when insufficient_privilege then null; end;
 begin
  insert into storage.objects(bucket_id,name) values('meal-photos',auth.uid()::text || '/test.jpg');
  raise exception 'Storage bypass';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Matching email alone, an unverified email, and old anonymous sessions do not qualify.
update auth.users set raw_app_meta_data='{"provider":"email"}' where right(id::text,1)='1';
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
do $$ begin if public.is_allowed_google_user() then raise exception 'Non-Google accepted'; end if; end $$;
reset role;
update auth.users set raw_app_meta_data='{"provider":"google"}', email_confirmed_at=null where right(id::text,1)='1';
set role authenticated;
do $$ begin if public.is_allowed_google_user() then raise exception 'Unverified accepted'; end if; end $$;
reset role;
update auth.users set email_confirmed_at=now(), is_anonymous=true where right(id::text,1)='1';
set role authenticated;
do $$ begin if public.is_allowed_google_user() then raise exception 'Anonymous accepted'; end if; end $$;
reset role;
set role supabase_auth_admin;
do $$ begin
 if public.before_user_created('{"user":{"email":"mrayandika.work@gmail.com","app_metadata":{"provider":"google"}}}') <> '{}'::jsonb then raise exception 'Hook rejects Raka'; end if;
 if not (public.before_user_created('{"user":{"email":"stranger@gmail.com","app_metadata":{"provider":"google"}}}') ? 'error') then raise exception 'Hook allows stranger'; end if;
 if not (public.before_user_created('{"user":{"email":"anggun.rizkye@gmail.com","app_metadata":{"provider":"email"}}}') ? 'error') then raise exception 'Hook allows email auth'; end if;
 if not (public.before_user_created('{"user":{}}') ? 'error') then raise exception 'Hook allows anonymous'; end if;
end $$;
reset role;
select 'Google allowlist, RPC, storage and signup hook checks passed' as result;
