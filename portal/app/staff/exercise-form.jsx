'use client';
import {useActionState,useState} from 'react';
import {saveExercise} from './exercise-actions';
import {cleanNote} from '../../lib/methodbook-data.mjs';
export default function ExerciseForm({measurementId,lesson,assignment}){
 const [state,action,pending]=useActionState(saveExercise,null),[note,setNote]=useState(cleanNote(assignment?.trainer_note??''));
 const ready=!lesson.sourceMissing&&(lesson.source_approved||lesson.demo_approved)&&lesson.member_enabled&&lesson.member_url;
 return <form action={action} className="exercise-edit"><input type="hidden" name="measurement_id" value={measurementId}/><input type="hidden" name="lesson_id" value={lesson.id}/><label>クライアント向けの説明・回数・頻度<textarea name="trainer_note" maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} rows={2} placeholder="説明・回数・頻度を入力"/></label><div className="exercise-actions"><div className="toggles"><button name="confirmed" value="false" disabled={pending}>下書き保存</button><button name="confirmed" value="true" disabled={pending||!ready}>選手に公開</button>{assignment&&<button name="remove" value="true" disabled={pending}>取り消す</button>}</div><small>{!ready?'教材の公開設定を確認してください':assignment?.confirmed?'公開設定済み（結果公開後に表示）':assignment?'下書き保存済み・選手には非表示':'下書きは選手には表示されません'}</small><div aria-live="polite">{state?.error&&<span role="alert">{state.error}</span>}{state?.success&&<span>{state.success}</span>}</div></div></form>;
}
