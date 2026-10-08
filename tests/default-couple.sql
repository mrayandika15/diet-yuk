-- Exercise upgrades from separate legacy couples, including an unrelated member.
reset role;
insert into public.profiles(id,data)
select '00000000-0000-4000-8000-000000000001',jsonb_set(data,'{name}','"Raka"')
from public.profiles where id='00000000-0000-4000-8000-000000000002';
insert into public.couple_members(user_id,couple_id)
select '00000000-0000-4000-8000-000000000003',couple_id from public.couple_members
where user_id='00000000-0000-4000-8000-000000000002';
insert into public.couples(id,wedding_date)
values('90000000-0000-4000-8000-000000000001','2028-03-12');
insert into public.couple_members(user_id,couple_id)
values('00000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001');
\ir ../supabase/migrations/202610080007_default_couple.sql
do $$ begin
 if (select count(*) from public.couple_members where couple_id='90000000-0000-4000-8000-000000000001')<>2 then
   raise exception 'Existing accounts not automatically linked'; end if;
 if (select wedding_date from public.couples where id='90000000-0000-4000-8000-000000000001')<>'2028-03-12'::date then
   raise exception 'Existing wedding date lost'; end if;
 if not exists(select 1 from public.couple_members where user_id='00000000-0000-4000-8000-000000000003'
   and couple_id<>'90000000-0000-4000-8000-000000000001') then raise exception 'Unrelated membership changed'; end if;
 perform public.ensure_default_couple();
 if (select count(*) from public.couple_members)<>3 then raise exception 'Backfill duplicated memberships'; end if;
end $$;

-- A partner who has not onboarded is named, without inventing body/target data.
delete from public.profiles where id='00000000-0000-4000-8000-000000000001';
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
do $$ declare summary jsonb:=public.couple_summary(); begin
 if summary->>'name'<>'Raka' or (summary->>'ready')::boolean or (summary->>'target')::numeric<>0 then
   raise exception 'Pending partner status incorrect'; end if;
 if summary ? 'inviteCode' then raise exception 'Retired invitation exposed'; end if;
end $$;

-- First profile save joins automatically; repeating an upsert stays in one couple.
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
insert into public.profiles(id,data) values(auth.uid(),'{"name":"Raka","sex":"male","birthDate":"1998-01-01","height":170,"weight":70,"targetWeight":65,"activity":1.375,"calorieTarget":1900,"weddingDate":"2027-09-26"}');
update public.profiles set data=data where id=auth.uid();
do $$ begin
 if public.my_couple_id()<>'90000000-0000-4000-8000-000000000001'::uuid then raise exception 'Onboarding not automatically linked'; end if;
 if (select count(*) from public.couple_members)<>2 then raise exception 'Duplicate or unrelated member visible'; end if;
 if not (public.couple_summary()->>'ready')::boolean then raise exception 'Partner not ready'; end if;
 begin perform public.create_couple(); raise exception 'Legacy create still callable'; exception when insufficient_privilege then null; end;
 begin perform public.join_couple('anything'); raise exception 'Legacy join still callable'; exception when insufficient_privilege then null; end;
 begin perform public.ensure_default_couple(); raise exception 'Internal repair exposed'; exception when insufficient_privilege then null; end;
 begin insert into public.couple_members(user_id,couple_id) values(auth.uid(),gen_random_uuid());
   raise exception 'Direct membership modification accepted'; exception when insufficient_privilege then null; end;
end $$;
select public.send_cheer('❤️');
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
select public.save_meal(jsonb_build_object('id','90000000-0000-4000-8000-000000000002',
 'date',(now() at time zone 'Asia/Jakarta')::date,'type','snack',
 'items','[{"name":"Pisang","portion_g":100,"calories":89,"protein_g":1,"carbs_g":23,"fat_g":0.3}]'::jsonb));
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
do $$ begin
 if (public.couple_summary()->>'calories')::numeric<>89 then raise exception 'Partner progress unavailable'; end if;
 if (select count(*) from public.profiles)<>2 then raise exception 'Partner profile unavailable'; end if;
 update public.profiles set data=jsonb_set(data,'{name}','"Attack"') where id<>auth.uid();
 if found then raise exception 'Partner profile editable'; end if;
 update public.meals set note='Attack' where id='90000000-0000-4000-8000-000000000002';
 if found then raise exception 'Partner meal editable'; end if;
end $$;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';
do $$ begin
 if exists(select 1 from public.profiles) or exists(select 1 from public.meals) then
   raise exception 'Third account can read shared data'; end if;
 begin perform public.couple_summary(); raise exception 'Third account summary allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Brand-new installation: Anggun may onboard first and Raka joins later.
select data::text as anggun_profile from public.profiles
where id='00000000-0000-4000-8000-000000000002' \gset
delete from public.profiles where id in ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002');
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
insert into public.profiles(id,data) values(auth.uid(),:'anggun_profile'::jsonb);
do $$ begin
 if public.my_couple_id() is null or (public.couple_summary()->>'ready')::boolean then
   raise exception 'First onboarding did not create pending couple'; end if;
end $$;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
insert into public.profiles(id,data) values(auth.uid(),jsonb_set(:'anggun_profile'::jsonb,'{name}','"Raka"'));
do $$ begin
 if (select count(*) from public.couple_members where couple_id=public.my_couple_id())<>2 then
   raise exception 'Second onboarding created separate couple'; end if;
end $$;
reset role;
select 'Automatic couple upgrade, onboarding, pending partner, sharing and ownership checks passed' as result;
