// Isolated database only. No Supabase credentials, network requests or live writes.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const { PGlite } = await import(process.env.THQ_PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
        create schema auth; create table auth.users(id uuid primary key);
        create table organisations(id uuid primary key);
        create table competitions(id uuid primary key,organisation_id uuid references organisations(id));
        create table communication_messages(id uuid primary key,organisation_id uuid,created_at timestamptz default now());
        create table communication_recipients(id uuid primary key);`)
    const sql = await readFile(new URL('../../supabase/migrations/20261007_tournament_communications.sql', import.meta.url), 'utf8')
    await db.exec(sql)
    await db.exec(sql) // Safe to rerun the migration.
    const org = '00000000-0000-4000-8000-000000000001', other = '00000000-0000-4000-8000-000000000002', competition = '00000000-0000-4000-8000-000000000003', user = '00000000-0000-4000-8000-000000000004'
    await db.query('insert into organisations values ($1),($2)', [org, other])
    await db.query('insert into auth.users values ($1)', [user])
    await db.query('insert into competitions values ($1,$2)', [competition,org])
    await assert.rejects(() => db.query('insert into communication_messages(id,organisation_id,competition_id) values (gen_random_uuid(),$1,$2)', [other,competition]), /Competition does not belong/)
    await db.query('insert into communication_messages(id,organisation_id,competition_id) values (gen_random_uuid(),$1,$2)', [org,competition])
    await assert.rejects(() => db.query('insert into competition_communication_contacts(organisation_id,competition_id,user_id,consent_recorded_by) values ($1,$2,$3,$3)', [other,competition,user]), /Competition does not belong/)
    await db.query('insert into competition_communication_contacts(organisation_id,competition_id,user_id,consent_recorded_by) values ($1,$2,$3,$3)', [org,competition,user])
    assert.equal((await db.query('select whatsapp_opt_in from competition_communication_contacts')).rows[0].whatsapp_opt_in, false)
    await assert.rejects(() => db.query("update competition_communication_contacts set phone_e164='bad'"))
    for (const role of ['anon', 'authenticated']) {
        await db.exec(`set role ${role}`)
        await assert.rejects(() => db.query('select * from competition_communication_contacts'), /permission denied/)
        await db.exec('reset role')
    }
    console.log('PASS: migration rerun, competition ownership constraints, consent defaults, phone validation and contact privacy.')
} finally { await db.close() }
