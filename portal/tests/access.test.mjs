import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { measurementInput } from '../lib/measurement-input.mjs';
import { masters } from '../../tests/helpers.mjs';

const db = new PGlite();
const id = n => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
before(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as
      $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    grant usage on schema public, auth to authenticated, anon, service_role;
    grant execute on function auth.uid() to authenticated, anon;
  `);
  await db.exec(readFileSync(new URL('../../supabase/migrations/0001_athlete_accounts.sql', import.meta.url), 'utf8'));
  await db.exec(readFileSync(new URL('../../supabase/migrations/0002_member_invitations.sql', import.meta.url), 'utf8'));
  await db.exec(`
    insert into auth.users(id) values ${[1,2,3,4,5,6].map(n => `('${id(n)}')`).join(',')};
    insert into public.athlete_companies(id,name) values ('${id(10)}','会社A'),('${id(20)}','会社B');
    insert into public.athlete_staff(user_id,company_id,role,display_name) values
      ('${id(1)}','${id(10)}','admin','管理者A'),('${id(2)}','${id(10)}','trainer','担当A'),
      ('${id(3)}','${id(20)}','trainer','担当B');
    insert into public.athlete_members(id,company_id,display_name) values
      ('${id(11)}','${id(10)}','会員A'),('${id(12)}','${id(10)}','会員A2'),('${id(21)}','${id(20)}','会員B');
    insert into public.athlete_member_access(user_id,member_id,company_id) values
      ('${id(4)}','${id(11)}','${id(10)}'),('${id(5)}','${id(12)}','${id(10)}'),('${id(6)}','${id(21)}','${id(20)}');
    insert into public.athlete_measurements(id,company_id,member_id,measured_on,age_band,threshold_sex,published) values
      ('${id(101)}','${id(10)}','${id(11)}','2026-10-17','adult','M',true),
      ('${id(102)}','${id(10)}','${id(11)}','2026-10-17','adult','M',false),
      ('${id(103)}','${id(10)}','${id(12)}','2026-10-17','junior','F',true),
      ('${id(201)}','${id(20)}','${id(21)}','2026-10-17','adult','F',true);
    insert into public.athlete_internal_notes(member_id,company_id,note) values ('${id(11)}','${id(10)}','内部メモ');
    insert into public.athlete_scoring_settings(company_id) values ('${id(10)}'),('${id(20)}');
  `);
});
after(async () => db.close());
async function asUser(user, fn, role = 'authenticated') {
  await db.exec(`begin; set local role ${role}; select set_config('request.jwt.claim.sub','${id(user)}',true);`);
  try { return await fn(); } finally { await db.exec('rollback'); }
}
const query = sql => db.query(sql);

test('入力→下書き保存→本人非表示→公開→本人表示→公開取消', async () => {
  const form=new FormData();form.set('measured_on','2026-10-17');form.set('value:cmj','32.5');form.set('value:split','0');form.set('public_comment','今回の公開コメント');
  const payload=measurementInput(form,{birth_date:'2000-01-01',threshold_sex:'M'},masters());
  await db.exec('begin');
  try {
    await db.exec(`set local role authenticated; select set_config('request.jwt.claim.sub','${id(2)}',true)`);
    await db.query(`insert into athlete_measurements(id,company_id,member_id,measured_on,age_band,threshold_sex,values,saved_score,public_comment,published) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[id(999),id(10),id(11),payload.measured_on,payload.age_band,payload.threshold_sex,JSON.stringify(payload.values),JSON.stringify(payload.saved_score),payload.public_comment,payload.published]);
    await db.exec(`select set_config('request.jwt.claim.sub','${id(4)}',true)`);
    assert.equal((await query(`select * from athlete_measurements where id='${id(999)}'`)).rows.length,0);
    await db.exec(`select set_config('request.jwt.claim.sub','${id(2)}',true);update athlete_measurements set published=true where id='${id(999)}';select set_config('request.jwt.claim.sub','${id(4)}',true)`);
    const row=(await query(`select * from athlete_measurements where id='${id(999)}'`)).rows[0];
    assert.deepEqual(row.values,payload.values);assert.deepEqual(row.saved_score,JSON.parse(JSON.stringify(payload.saved_score)));assert.equal(row.public_comment,'今回の公開コメント');
    await db.exec(`select set_config('request.jwt.claim.sub','${id(5)}',true)`);
    assert.equal((await query(`select * from athlete_measurements where id='${id(999)}'`)).rows.length,0);
    await db.exec(`select set_config('request.jwt.claim.sub','${id(2)}',true);update athlete_measurements set published=false where id='${id(999)}';select set_config('request.jwt.claim.sub','${id(4)}',true)`);
    assert.equal((await query(`select * from athlete_measurements where id='${id(999)}'`)).rows.length,0);
  } finally { await db.exec('rollback'); }
});
test('本人には公開済みの自分の測定だけ返る', async () => asUser(4, async () => {
  assert.deepEqual((await query('select id from athlete_measurements')).rows, [{ id: id(101) }]);
  assert.deepEqual((await query('select id from athlete_members')).rows, [{ id: id(11) }]);
}));
test('本人がURL相当のIDを指定しても同社の別会員・他社の記録は返らない', async () => asUser(4, async () => {
  for (const n of [102,103,201]) assert.equal((await query(`select * from athlete_measurements where id='${id(n)}'`)).rows.length, 0);
}));
test('会員は内部メモ・スタッフ名簿を取得できない', async () => asUser(4, async () => {
  assert.equal((await query('select * from athlete_internal_notes')).rows.length, 0);
  assert.equal((await query('select * from athlete_staff')).rows.length, 0);
}));
test('会員は結果・自分のプロフィールを書き換えられない', async () => asUser(4, async () => {
  assert.equal((await query("update athlete_measurements set public_comment='改変' returning id")).rows.length, 0);
  assert.equal((await query("update athlete_members set display_name='改変' returning id")).rows.length, 0);
}));
test('本人の測定追加は拒否される', async () => asUser(4, async () => {
  await assert.rejects(query(`insert into athlete_measurements(company_id,member_id,measured_on,age_band,threshold_sex)
    values('${id(10)}','${id(11)}','2026-10-17','adult','M')`), /row-level security/);
}));
test('トレーナーは自社の未公開測定も読めるが他社は読めない', async () => asUser(2, async () => {
  assert.equal((await query('select * from athlete_measurements')).rows.length, 3);
  assert.equal((await query(`select * from athlete_members where company_id='${id(20)}'`)).rows.length, 0);
  assert.equal((await query('select * from athlete_internal_notes')).rows.length, 1);
}));
test('トレーナーは自社に記録できる', async () => asUser(2, async () => {
  const r = await query(`insert into athlete_measurements(company_id,member_id,measured_on,age_band,threshold_sex,values)
    values('${id(10)}','${id(11)}','2026-10-17','adult','M','{"split":0}') returning values`);
  assert.equal(r.rows[0].values.split, 0);
}));
test('自社IDと他社会員IDの組合せは保存できない', async () => asUser(2, async () => {
  await assert.rejects(query(`insert into athlete_measurements(company_id,member_id,measured_on,age_band,threshold_sex)
    values('${id(10)}','${id(21)}','2026-10-17','adult','M')`), /foreign key/);
}));
test('他社への書込みは拒否される', async () => asUser(2, async () => {
  await assert.rejects(query(`insert into athlete_members(company_id,display_name) values('${id(20)}','侵入')`), /row-level security/);
}));
test('トレーナーは評価基準を変更できない', async () => asUser(2, async () => {
  assert.equal((await query("update athlete_scoring_settings set rules='{}' returning company_id")).rows.length, 0);
}));
test('管理者は自社の評価基準だけ変更できる', async () => asUser(1, async () => {
  const r = await query("update athlete_scoring_settings set rules='{}' returning company_id");
  assert.deepEqual(r.rows, [{ company_id: id(10) }]);
}));
test('本人の紐付けとスタッフ権限をクライアントから変更できない', async () => {
  await asUser(4, async () => assert.rejects(query(`update athlete_member_access set member_id='${id(12)}'`), /permission denied/));
  await asUser(2, async () => assert.rejects(query("update athlete_staff set role='admin'"), /permission denied/));
});
test('未ログインでの読出しは拒否される', async () => asUser(4, async () => {
  await assert.rejects(query('select * from athlete_measurements'), /permission denied/);
}, 'anon'));
test('無効化された本人のアクセスは直ちに止まる', async () => {
  await db.exec(`update athlete_member_access set active=false where user_id='${id(4)}'`);
  try { await asUser(4, async () => assert.equal((await query('select * from athlete_measurements')).rows.length, 0)); }
  finally { await db.exec(`update athlete_member_access set active=true where user_id='${id(4)}'`); }
});
test('会社を停止するとスタッフ・会員のどちらも読めなくなる', async () => {
  await db.exec(`update athlete_companies set active=false where id='${id(10)}'`);
  try { for (const n of [1,2,4]) await asUser(n, async () => assert.equal((await query('select * from athlete_measurements')).rows.length, 0)); }
  finally { await db.exec(`update athlete_companies set active=true where id='${id(10)}'`); }
});
test('自己申告の管理者メタデータではスタッフにならない', async () => {
  await db.exec(`insert into auth.users(id,raw_user_meta_data) values('${id(7)}','{"role":"admin"}')`);
  await asUser(7, async () => assert.equal((await query('select * from athlete_members')).rows.length, 0));
});
test('確認済みメールに一致する有効な招待だけ受け取れる', async () => {
  await db.exec(`insert into auth.users(id,email,email_confirmed_at) values('${id(8)}','invite@example.test',now());
    insert into athlete_members(id,company_id,display_name) values('${id(13)}','${id(10)}','招待対象');
    insert into athlete_invitations(company_id,member_id,email) values('${id(10)}','${id(13)}','invite@example.test');`);
  await asUser(8, async () => {
    assert.equal((await query('select accept_athlete_invitation() as count')).rows[0].count, 1);
    assert.deepEqual((await query('select id from athlete_members')).rows, [{ id: id(13) }]);
    assert.equal((await query('select accept_athlete_invitation() as count')).rows[0].count, 0);
  });
});
test('メール未確認・別メール・期限切れの招待では紐付かない', async () => {
  await db.exec(`insert into auth.users(id,email) values('${id(9)}','invite@example.test');`);
  await asUser(9, async () => assert.equal((await query('select accept_athlete_invitation() as count')).rows[0].count, 0));
  await db.exec(`update auth.users set email_confirmed_at=now(),email='different@example.test' where id='${id(9)}';`);
  await asUser(9, async () => assert.equal((await query('select accept_athlete_invitation() as count')).rows[0].count, 0));
  await db.exec(`update auth.users set email='invite@example.test' where id='${id(9)}';
    update athlete_invitations set expires_at=now()-interval '1 hour' where member_id='${id(13)}';`);
  await asUser(9, async () => assert.equal((await query('select accept_athlete_invitation() as count')).rows[0].count, 0));
});
test('招待作成は自社管理者だけができる', async () => {
  await asUser(2, async () => assert.rejects(query(`insert into athlete_invitations(company_id,member_id,email)
    values('${id(10)}','${id(12)}','other@example.test')`), /row-level security/));
  await asUser(1, async () => {
    assert.equal((await query(`insert into athlete_invitations(company_id,member_id,email)
      values('${id(10)}','${id(12)}','other@example.test') returning id`)).rows.length, 1);
  });
  await asUser(1, async () => assert.rejects(query(`insert into athlete_invitations(company_id,member_id,email)
    values('${id(20)}','${id(21)}','other@example.test')`), /row-level security/));
});
test('招待メールアドレス一覧は本人やトレーナーに公開しない', async () => {
  for (const n of [2,4,8]) await asUser(n, async () => assert.equal((await query('select * from athlete_invitations')).rows.length, 0));
});
