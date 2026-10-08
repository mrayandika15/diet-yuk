-- Raka and Anggun share one couple automatically. No invitation is needed.
-- Internal only: identity comes from verified Google records in auth.users.
create or replace function public.ensure_default_couple() returns uuid
language plpgsql security definer set search_path='' as $$
declare members uuid[]; target uuid; wedding date;
begin
 -- Serialize first onboarding and simultaneous profile saves across both accounts.
 perform pg_advisory_xact_lock(20261008,7);
 select array_agg(p.id order by lower(u.email)='mrayandika.work@gmail.com' desc,p.id)
 into members from public.profiles p join auth.users u on u.id=p.id
 where u.is_anonymous is false and u.email_confirmed_at is not null
   and u.raw_app_meta_data->>'provider'='google'
   and lower(u.email) in ('mrayandika.work@gmail.com','anggun.rizkye@gmail.com');
 if members is null then return null; end if;
 if cardinality(members)>2 then raise exception 'Identitas akun pasangan tidak unik'; end if;

 -- Preserve an existing shared date. When old accounts had separate couples,
 -- prefer Raka's couple, then Anggun's. Never reuse a couple with other members.
 select m.couple_id into target from unnest(members) with ordinality wanted(id,position)
 join public.couple_members m on m.user_id=wanted.id
 where not exists (select 1 from public.couple_members other
   where other.couple_id=m.couple_id and not (other.user_id=any(members)))
 order by wanted.position limit 1;
 if target is null then
   select c.wedding_date into wedding from unnest(members) with ordinality wanted(id,position)
   join public.couple_members m on m.user_id=wanted.id
   join public.couples c on c.id=m.couple_id order by wanted.position limit 1;
   if wedding is null then
     select coalesce((data->>'weddingDate')::date,'2027-09-26'::date)
     into wedding from public.profiles where id=members[1];
   end if;
   insert into public.couples(wedding_date) values(wedding) returning id into target;
 end if;
 insert into public.couple_members(user_id,couple_id)
 select id,target from unnest(members) wanted(id)
 on conflict(user_id) do update set couple_id=excluded.couple_id
 where public.couple_members.couple_id is distinct from excluded.couple_id;
 return target;
end $$;
revoke all on function public.ensure_default_couple() from public,anon,authenticated;

create or replace function public.connect_default_couple_profile() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists (select 1 from auth.users u where u.id=new.id
   and u.is_anonymous is false and u.email_confirmed_at is not null
   and u.raw_app_meta_data->>'provider'='google'
   and lower(u.email) in ('mrayandika.work@gmail.com','anggun.rizkye@gmail.com')) then
   perform public.ensure_default_couple();
 end if;
 return new;
end $$;
revoke all on function public.connect_default_couple_profile() from public,anon,authenticated;
create trigger profiles_default_couple after insert or update of data on public.profiles
 for each row execute function public.connect_default_couple_profile();

-- Backfill already onboarded accounts without touching their meals or profiles.
select public.ensure_default_couple();

-- Retire invite RPCs, including access by old app versions.
revoke all on function public.create_couple(date) from public,anon,authenticated;
revoke all on function public.join_couple(text) from public,anon,authenticated;

create or replace function public.couple_summary() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c public.couples; p public.profiles; calories numeric; partner_name text;
begin
 if not public.is_allowed_google_user() then raise exception 'Akses ditolak' using errcode='42501'; end if;
 select * into c from public.couples where id=public.my_couple_id();
 if c.id is null then return null; end if;
 select profiles.* into p from public.profiles profiles
 join public.couple_members members on members.user_id=profiles.id
 where members.couple_id=c.id and profiles.id<>auth.uid();
 select case when lower(email)='mrayandika.work@gmail.com' then 'Anggun' else 'Raka' end
 into partner_name from auth.users where id=auth.uid();
 select coalesce(sum((item->>'calories')::numeric),0) into calories
 from public.meals m cross join lateral jsonb_array_elements(m.items) item
 where m.user_id=p.id and m.eaten_on=(now() at time zone 'Asia/Jakarta')::date;
 return jsonb_build_object('name',coalesce(p.data->>'name',partner_name),
   'ready',p.id is not null,'target',coalesce((p.data->>'calorieTarget')::numeric,0),
   'calories',calories,'coupleId',c.id,'weddingDate',c.wedding_date);
end $$;
revoke all on function public.couple_summary() from public,anon;
grant execute on function public.couple_summary() to authenticated;
