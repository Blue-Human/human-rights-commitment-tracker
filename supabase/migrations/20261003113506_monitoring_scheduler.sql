-- Supabase-managed scheduling: no always-on server or GitHub repository secret needed.
-- Deploy live-tracker before applying this activation migration.
create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists supabase_vault;
do $$
declare token text;
begin
 select decrypted_secret into token from vault.decrypted_secrets where name='hrct_monitoring_token' limit 1;
 if token is null then
  token:='hrct_'||gen_random_uuid()::text||gen_random_uuid()::text;
  perform vault.create_secret(token,'hrct_monitoring_token','Credential for the HRCT scheduler only');
 end if;
 insert into public.hrct_monitoring_tokens(token_hash) values(encode(sha256(convert_to(token,'UTF8')),'hex')) on conflict do nothing;
 if not exists(select 1 from vault.secrets where name='hrct_monitoring_url') then
  perform vault.create_secret('https://gostbdmrzchccnydftgd.supabase.co/functions/v1/live-tracker','hrct_monitoring_url','HRCT project function URL');
 end if;
end $$;
select cron.schedule('hrct-discover','17 * * * *',$job$
 select net.http_post(
  url:=(select decrypted_secret from vault.decrypted_secrets where name='hrct_monitoring_url' limit 1),
  headers:=jsonb_build_object('Content-Type','application/json','x-hrct-monitoring-secret',(select decrypted_secret from vault.decrypted_secrets where name='hrct_monitoring_token' limit 1)),
  body:='{"job":"discover"}'::jsonb,timeout_milliseconds:=150000);
$job$);
select cron.schedule('hrct-process','37 4 * * *',$job$
 select net.http_post(
  url:=(select decrypted_secret from vault.decrypted_secrets where name='hrct_monitoring_url' limit 1),
  headers:=jsonb_build_object('Content-Type','application/json','x-hrct-monitoring-secret',(select decrypted_secret from vault.decrypted_secrets where name='hrct_monitoring_token' limit 1)),
  body:='{"job":"process"}'::jsonb,timeout_milliseconds:=150000);
$job$);
select cron.schedule('hrct-assessment-watch','47 5 * * 1',$job$
 select net.http_post(
  url:=(select decrypted_secret from vault.decrypted_secrets where name='hrct_monitoring_url' limit 1),
  headers:=jsonb_build_object('Content-Type','application/json','x-hrct-monitoring-secret',(select decrypted_secret from vault.decrypted_secrets where name='hrct_monitoring_token' limit 1)),
  body:='{"job":"watch"}'::jsonb,timeout_milliseconds:=150000);
$job$);
