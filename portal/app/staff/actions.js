'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireStaff, staffMember } from '../../lib/staff';
import { memberInput, measurementInput } from '../../lib/measurement-input.mjs';

export async function registerMember(previous, form) {
  let id;
  try {
    const company_id = String(form.get('company_id') ?? '');
    if (!company_id) throw new Error('所属会社を選択してください。');
    const { db } = await requireStaff(company_id);
    const fields = memberInput(form);
    const result = await db.from('athlete_members').insert({ ...fields, company_id }).select('id').single();
    if (result.error) throw new Error('会員を登録できませんでした。通信状態を確認してください。');
    id = result.data.id;
  } catch (e) { if (e.digest?.startsWith('NEXT_REDIRECT')) throw e; return { error: e.message }; }
  revalidatePath('/staff');
  redirect(`/staff/members/${id}`);
}
export async function saveMeasurement(previous, form) {
  let memberId; let recordId;
  try {
    memberId = String(form.get('member_id') ?? '');
    const { db, member } = await staffMember(memberId);
    recordId = String(form.get('record_id') ?? '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recordId)) throw new Error('画面を再読込してから保存してください。');
    const settings = await db.from('athlete_scoring_settings').select('thresholds,rules').eq('company_id', member.company_id).maybeSingle();
    if (settings.error) throw new Error('評価基準を読み込めませんでした。');
    const fields = measurementInput(form, member, settings.data);
    const result = await db.from('athlete_measurements').insert({ ...fields, id: recordId, company_id: member.company_id, member_id: member.id });
    if (result.error) {
      // 通信後の再送は同一IDを使い、重複測定を作らない。
      const existing = await db.from('athlete_measurements').select('id').eq('id', recordId).eq('member_id', member.id).eq('company_id', member.company_id).maybeSingle();
      if (!existing.data) throw new Error('保存できませんでした。入力を残したまま再度お試しください。');
    }
  } catch (e) { if (e.digest?.startsWith('NEXT_REDIRECT')) throw e; return { error: e.message }; }
  revalidatePath(`/staff/members/${memberId}`);
  redirect(`/staff/results/${recordId}`);
}
export async function setPublication(previous, form) {
  let id;
  try {
    id = String(form.get('record_id') ?? '');
    const { db, staff } = await requireStaff();
    const published = form.get('published') === 'true';
    const result = await db.from('athlete_measurements').update({ published }).eq('id', id).in('company_id', staff.map(s => s.company_id)).select('member_id').single();
    if (result.error || !result.data) throw new Error('公開状態を変更できませんでした。');
    revalidatePath(`/staff/members/${result.data.member_id}`);
  } catch (e) { if (e.digest?.startsWith('NEXT_REDIRECT')) throw e; return { error: e.message }; }
  revalidatePath('/mypage');
  revalidatePath(`/mypage/results/${id}`);
  revalidatePath(`/staff/results/${id}`);
  return { success: '公開状態を更新しました。' };
}
