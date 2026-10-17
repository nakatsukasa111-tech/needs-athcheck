'use client';
import { useActionState,useState } from 'react';
import { saveExercise } from './exercise-actions';
export default function ExerciseForm({measurementId,lesson,assignment}){
 const [state,action,pending]=useActionState(saveExercise,null);
 const [note,setNote]=useState(assignment?.trainer_note??'');
 const ready=(lesson.source_approved||lesson.demo_approved)&&lesson.member_enabled&&lesson.member_url;
 return <form action={action}><input type="hidden" name="measurement_id" value={measurementId}/><input type="hidden" name="lesson_id" value={lesson.id}/><p>{ready?'会員への提案が可能':'教材元の承認・会員への公開設定待ち'}{assignment?.confirmed?' ／ トレーナー確定済み':assignment?' ／ 候補を保存済み':''}</p><label>本人向けの説明・回数・頻度<textarea name="trainer_note" maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} rows={2}/></label><div className="toggles"><button name="confirmed" value="false" disabled={pending}>候補として保存</button><button name="confirmed" value="true" disabled={pending||!ready}>確認して本人向けに確定</button>{assignment&&<button name="remove" value="true" disabled={pending}>選択を取り消す</button>}</div><div aria-live="polite">{state?.error&&<p role="alert">{state.error}</p>}{state?.success&&<p>{state.success}</p>}</div></form>;
}
