\ir ../supabase/migrations/202610080006_catalog_estimate.sql
delete from public.ai_analysis_jobs;
set role service_role;
select public.ai_worker_heartbeat();
reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
do $$ declare invalid jsonb; begin
 for invalid in select v from (values ('{}'::jsonb), ('{"kind":"meal","id":"https://evil.test","preparation":"as_listed"}'), ('{"kind":"ingredient","id":"Eggs","preparation":"invented"}'), ('{"kind":"meal","id":"12345","preparation":"fried"}'), ('{"kind":"ingredient","id":null,"preparation":"boiled"}')) x(v) loop
  begin perform public.queue_catalog_estimate(invalid,gen_random_uuid()); raise exception 'Invalid menu accepted';
  exception when raise_exception then if sqlerrm='Invalid menu accepted' then raise; end if; end;
 end loop;
end $$;
select public.queue_catalog_estimate('{"kind":"ingredient","id":"Eggs","preparation":"boiled","image":"https://evil.test","calories":0}','80000000-0000-4000-8000-000000000001');
select public.queue_catalog_estimate('{}','80000000-0000-4000-8000-000000000001');
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
do $$ begin
 begin perform public.food_analysis_result('80000000-0000-4000-8000-000000000001'); raise exception 'Partner read menu job'; exception when insufficient_privilege then null; end;
 begin perform public.queue_catalog_estimate('{}','80000000-0000-4000-8000-000000000001'); raise exception 'Partner reused menu ID'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set role service_role;
do $$ declare job jsonb; begin
 job:=public.claim_food_analysis();
 if job->>'kind'<>'food_catalog' then raise exception 'Catalog job kind lost'; end if;
 if job->'profile' ? 'image' or job->'profile' ? 'calories' then raise exception 'Client injected nutrition or image'; end if;
 perform public.finish_food_analysis((job->>'id')::uuid,(job->>'lease_token')::uuid,'{"items":[],"questions":[]}');
 if exists(select 1 from public.ai_analysis_jobs where profile_payload is not null) then raise exception 'Raw selection retained'; end if;
end $$;
reset role;
set role anon;
do $$ begin
 begin perform public.queue_catalog_estimate('{}',gen_random_uuid()); raise exception 'Anonymous menu accepted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'Live catalog queue validation, owner isolation and metadata integrity checks passed' as result;
