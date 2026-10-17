'use server';
import { revalidatePath } from 'next/cache';
import { requireStaff } from '../../lib/staff';
export async function saveExercise(previous,form){
 try{
  const {db,staff}=await requireStaff();
  const measurement_id=String(form.get('measurement_id')??'');
  const record=await db.from('athlete_measurements').select('company_id').eq('id',measurement_id).in('company_id',staff.map(s=>s.company_id)).single();
  if(record.error)throw Error('測定を確認できません。');
  const lesson_id=String(form.get('lesson_id')??'');
  const trainer_note=String(form.get('trainer_note')??'').trim();
  if(trainer_note.length>2000)throw Error('説明は2000文字以内で入力してください。');
  const company_id=record.data.company_id;
  const result=form.get('remove')==='true'?await db.from('athlete_exercise_assignments').delete().eq('measurement_id',measurement_id).eq('company_id',company_id).eq('lesson_id',lesson_id):await db.from('athlete_exercise_assignments').upsert({measurement_id,company_id,lesson_id,trainer_note,confirmed:form.get('confirmed')==='true'});
  if(result.error)throw Error('保存できません。教材の承認・会員への公開設定を確認してください。');
  revalidatePath(`/staff/results/${measurement_id}`);revalidatePath(`/mypage/results/${measurement_id}`);revalidatePath('/mypage');
  return {success:form.get('remove')==='true'?'選択を取り消しました。':'教材の提案を保存しました。'};
 }catch(e){if(e.digest?.startsWith('NEXT_REDIRECT'))throw e;return {error:e.message};}
}
