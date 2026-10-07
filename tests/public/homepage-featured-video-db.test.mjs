// Runs in an isolated PostgreSQL-compatible database; never connects to Supabase.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const { PGlite } = await import(process.env.THQ_PGLITE_MODULE || '@electric-sql/pglite')
const db = new PGlite()
try {
    await db.exec(`create table media(id uuid primary key, organisation_id uuid, category text, status text,
        featured boolean default false, published_at timestamptz);`)
    const org = '00000000-0000-4000-8000-000000000001'
    const other = '00000000-0000-4000-8000-000000000002'
    const old = '00000000-0000-4000-8000-000000000011'
    const goals = '00000000-0000-4000-8000-000000000012'
    const interview = '00000000-0000-4000-8000-000000000013'
    const remote = '00000000-0000-4000-8000-000000000014'
    await db.query(`insert into media values ($1,$2,'Full Match Replay','published',true,now())`, [old,org])
    const sql = await readFile(new URL('../../supabase/migrations/20261007_homepage_featured_video.sql', import.meta.url),'utf8')
    await db.exec(sql)
    const selected = async orgId => (await db.query(`select id from media where organisation_id=$1 and homepage_featured and status='published'`,[orgId])).rows.map(r=>r.id)
    assert.deepEqual(await selected(org),[old], 'preserve current selection')
    await db.query(`insert into media(id,organisation_id,category,status,homepage_featured) values ($1,$2,'Match Highlights','published',true)`,[goals,org])
    assert.deepEqual(await selected(org),[goals], 'highlights replace full match')
    await db.query(`insert into media(id,organisation_id,category,status,homepage_featured) values ($1,$2,'Player Interview','draft',true)`,[interview,org])
    assert.deepEqual(await selected(org),[goals], 'draft does not displace live selection')
    await db.query(`insert into media(id,organisation_id,category,status,homepage_featured) values ($1,$2,'Match Highlights','published',true)`,[remote,other])
    await db.query(`update media set status='published' where id=$1`,[interview])
    assert.deepEqual(await selected(org),[interview])
    assert.deepEqual(await selected(other),[remote], 'different organisation untouched')
    await assert.rejects(db.query(`update media set category='Photo Gallery' where id=$1`,[interview]))
    await db.exec(sql)
    assert.deepEqual(await selected(org),[interview], 'rerunning migration must not restore old selection')
    await db.query(`update media set homepage_featured=false where id=$1`,[interview])
    assert.deepEqual(await selected(org),[], 'unchecking removes selection without reviving old match')
    assert.equal((await db.query(`select featured from media where id=$1`,[old])).rows[0].featured,true,'library featuring stays independent')
    console.log('PASS: migration preserves selection; highlights replace full match; drafts defer; publication replaces; scope isolated; gallery rejected; rerun safe; deselection respected.')
} finally { await db.close() }
