\ir ../supabase/migrations/202610080003_managed_ai.sql
update auth.users set is_anonymous=false,email_confirmed_at=now(),raw_app_meta_data='{"provider":"google"}' where right(id::text,1) in ('1','2');
set role service_role;
select public.ai_worker_heartbeat();
reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
select public.queue_food_analysis('/9j/abcd','50000000-0000-4000-8000-000000000001');
select public.queue_food_analysis('/9j/abcd','50000000-0000-4000-8000-000000000001');
do $$ begin
 if public.food_analysis_result('50000000-0000-4000-8000-000000000001')->>'status'<>'queued' then raise exception 'Missing queued job'; end if;
 begin
  perform public.queue_food_analysis('/9j/abcd','50000000-0000-4000-8000-000000000009');
  raise exception 'Concurrent job allowed';
 exception when raise_exception then if sqlerrm<>'Analisis sebelumnya masih berjalan. Tunggu sebentar.' then raise; end if; end;
 begin
  perform public.claim_food_analysis(); raise exception 'Client can claim';
 exception when insufficient_privilege then null; end;
 begin
  perform image_base64 from public.ai_analysis_jobs; raise exception 'Direct photo access';
 exception when insufficient_privilege then null; end;
end $$;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
do $$ begin
 begin
  perform public.food_analysis_result('50000000-0000-4000-8000-000000000001'); raise exception 'Partner can read private AI job';
 exception when insufficient_privilege then null; end;
 begin
  perform public.queue_food_analysis('/9j/abcd','50000000-0000-4000-8000-000000000001'); raise exception 'Job owner overwrite';
 exception when insufficient_privilege then null; end;
 begin
  perform public.queue_food_analysis('invalid','50000000-0000-4000-8000-000000000002'); raise exception 'Invalid image accepted';
 exception when raise_exception then if sqlerrm<>'Foto JPEG tidak valid atau terlalu besar' then raise; end if; end;
end $$;
select public.queue_food_analysis('/9j/abcd','50000000-0000-4000-8000-000000000002');
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000003';
do $$ begin
 begin perform public.ai_status(); raise exception 'Stranger can access AI'; exception when insufficient_privilege then null; end;
 begin perform public.queue_food_analysis('/9j/abcd',gen_random_uuid()); raise exception 'Stranger can queue'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set role service_role;
select public.claim_food_analysis() as claimed \gset
select set_config('test.claimed', :'claimed', false);
do $$ declare job jsonb=current_setting('test.claimed')::jsonb; begin
 begin
  perform public.finish_food_analysis((job->>'id')::uuid,gen_random_uuid(),'{"items":[],"notes":"test"}'); raise exception 'Wrong lease accepted';
 exception when insufficient_privilege then null; end;
 perform public.finish_food_analysis((job->>'id')::uuid,(job->>'lease_token')::uuid,'{"items":[],"notes":"test"}');
 if exists(select 1 from public.ai_analysis_jobs where id=(job->>'id')::uuid and image_base64 is not null) then raise exception 'Completed photo retained'; end if;
end $$;
do $$ declare job jsonb; begin
 job=public.claim_food_analysis();
 if job is null then raise exception 'Second job missing'; end if;
 if public.claim_food_analysis() is not null then raise exception 'Already processing job claimed twice'; end if;
 perform public.finish_food_analysis((job->>'id')::uuid,(job->>'lease_token')::uuid,null,'Test failure');
 if exists(select 1 from public.ai_analysis_jobs where image_base64 is not null) then raise exception 'Failed photo retained'; end if;
end $$;
reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
do $$ begin
 if public.food_analysis_result('50000000-0000-4000-8000-000000000001')->>'status'<>'completed' then raise exception 'Completed result inaccessible'; end if;
end $$;
reset role;
update public.ai_worker_status set last_seen=now()-interval '1 minute';
set role authenticated;
do $$ begin
 if (public.ai_status()->>'available')::boolean then raise exception 'Offline worker reported ready'; end if;
 begin perform public.queue_food_analysis('/9j/abcd',gen_random_uuid()); raise exception 'Offline job queued';
 exception when raise_exception then if sqlerrm<>'Analisis foto sedang tidak tersedia. Coba lagi sebentar.' then raise; end if; end;
end $$;
reset role;
select 'Managed AI auth, privacy, lease and availability checks passed' as result;
