// Local PostgreSQL-compatible verification. No network or production database is used.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const { PGlite } = await import(process.env.THQ_PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
try {
    await db.exec(`
        create role anon; create role authenticated; create role service_role bypassrls;
        create function uuid_generate_v4() returns uuid language sql as 'select gen_random_uuid()';
        create table public.organisations (id uuid primary key);
        create table public.communication_deliveries (
            id uuid primary key, organisation_id uuid, provider text, provider_message_id text,
            status text default 'queued', queued_at timestamptz default now(), updated_at timestamptz,
            sent_at timestamptz, delivered_at timestamptz, read_at timestamptz, failed_at timestamptz,
            error_code text, error_message text, last_provider_event text, last_provider_event_at timestamptz
        );
        create table public.communication_webhook_events (
            id uuid primary key default gen_random_uuid(), provider text, event_id text, event_type text,
            provider_message_id text, delivery_id uuid, event_created_at timestamptz, processed_at timestamptz,
            outcome text, unique(provider,event_id)
        );
    `)
    await db.exec(await readFile(new URL('../../supabase/migrations/20260930_club_whatsapp_connections.sql', import.meta.url), 'utf8'))
    const club = '00000000-0000-4000-8000-000000000001'
    const delivery = '00000000-0000-4000-8000-000000000002'
    await db.query('insert into organisations values ($1)', [club])
    await db.query(`insert into communication_deliveries(id,organisation_id,provider,whatsapp_phone_number_id) values ($1,$2,'meta','200')`, [delivery, club])
    const event = (id, status, seconds, phone = '200', message = 'wamid.test') => db.query(
        'select apply_meta_whatsapp_event($1,$2,$3,$4,$5,to_timestamp($6),$7) as result', [id, message, phone, delivery, status, seconds, status === 'failed' ? '131026' : null])
    const row = async () => (await db.query('select * from communication_deliveries where id=$1', [delivery])).rows[0]
    await assert.rejects(() => event('wrong-sender', 'delivered', 2000, 'other-sender'))
    await event('read-first', 'read', 3000)
    assert.equal((await row()).status, 'read')
    await db.query('select record_meta_whatsapp_submission($1,$2,$3)', [delivery, club, 'wamid.test'])
    assert.equal((await row()).status, 'read', 'late HTTP receipt must not regress webhook state')
    await event('delivered-later', 'delivered', 2000)
    await event('sent-later', 'sent', 1000)
    await event('failure-after-read', 'failed', 4000)
    assert.equal((await row()).status, 'read', 'out-of-order and failure callbacks cannot undo read')
    assert.ok((await row()).sent_at && (await row()).delivered_at && (await row()).read_at)
    const duplicate = await event('read-first', 'read', 3000)
    assert.equal(duplicate.rows[0].result.duplicate, true)
    assert.equal((await db.query('select count(*)::int as count from communication_webhook_events')).rows[0].count, 4)
    await assert.rejects(() => event('wrong-message', 'read', 5000, '200', 'wamid.other'))
    await db.query(`update communication_deliveries set status='queued',provider_message_id=null,last_provider_event_at=null,sent_at=null,delivered_at=null,read_at=null,failed_at=null where id=$1`, [delivery])
    await event('failure-first', 'failed', 6000)
    assert.equal((await row()).status, 'failed')
    await event('stale-success', 'sent', 5000)
    assert.equal((await row()).status, 'failed')
    await event('new-success', 'delivered', 7000)
    assert.equal((await row()).status, 'delivered')
    await db.query('select record_meta_whatsapp_submission($1,$2,$3)', [delivery, '00000000-0000-4000-8000-000000000099', 'wamid.bad'])
    assert.equal((await row()).provider_message_id, 'wamid.test', 'another club cannot attach a receipt')
    for (const role of ['anon', 'authenticated']) {
        for (const table of ['organisation_whatsapp_connections', 'whatsapp_onboarding_sessions']) {
            assert.equal((await db.query('select has_table_privilege($1,$2,\'SELECT\') as allowed', [role, table])).rows[0].allowed, false)
        }
        assert.equal((await db.query("select has_function_privilege($1,'apply_meta_whatsapp_event(text,text,text,uuid,text,timestamptz,text)','EXECUTE') as allowed", [role])).rows[0].allowed, false)
    }
    const policy = await db.query("select relrowsecurity,relforcerowsecurity from pg_class where relname='organisation_whatsapp_connections'")
    assert.equal(policy.rows[0].relrowsecurity, true)
    assert.equal(policy.rows[0].relforcerowsecurity, true)
    console.log('PASS: migration, sender/tenant isolation, early callbacks, duplicates, out-of-order events, receipt race, failure recovery, private table and function permissions.')
} finally { await db.close() }
