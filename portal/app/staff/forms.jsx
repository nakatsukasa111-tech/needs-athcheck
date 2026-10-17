'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
import { registerMember, saveMeasurement, setPublication } from './actions';
import {createDemoMeasurement} from '../../lib/demo-measurement.mjs';
import { athlete, categories } from '../../lib/measurement-input.mjs';
function Feedback({ state }) { return <div aria-live="polite">{state?.error && <p className="error" role="alert">{state.error}</p>}{state?.success && <p>{state.success}</p>}</div>; }
function usePreservedForm(state) {
  const ref=useRef(null);const snapshot=useRef(null);
  useEffect(()=>{if(state?.error && snapshot.current && ref.current){for(const el of ref.current.elements){if(!el.name)continue;if(el.type==='checkbox')el.checked=snapshot.current.has(el.name);else if(snapshot.current.has(el.name))el.value=snapshot.current.get(el.name);}}},[state]);
  return {ref,onSubmit:e=>{snapshot.current=new FormData(e.currentTarget);}};
}
export function MemberForm({ companies, today }) {
  const [state, action, pending] = useActionState(registerMember, null);
  const preserved=usePreservedForm(state);
  return <form action={action} {...preserved} className="card"><label htmlFor="company">所属会社</label><select id="company" name="company_id" required>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
    <label htmlFor="name">氏名</label><input id="name" name="display_name" required maxLength={100}/>
    <label htmlFor="birth">生年月日</label><input id="birth" name="birth_date" type="date" min="1900-01-01" max={today} required/>
    <label htmlFor="sex">評価基準の性別</label><select id="sex" name="threshold_sex" required defaultValue=""><option value="" disabled>選択してください</option><option value="M">男性</option><option value="F">女性</option></select>
    <label htmlFor="external">既存の顧客番号（任意）</label><input id="external" name="external_customer_no" maxLength={100}/>
    <Feedback state={state}/><button disabled={pending}>{pending ? '登録中…' : '会員を登録する'}</button></form>;
}
export function MeasurementForm({ memberId, recordId, today, demoEnabled=false }) {
  const [state, action, pending] = useActionState(saveMeasurement, null);
  const preserved=usePreservedForm(state);
  const lastDemo=useRef(null);const [demoCount,setDemoCount]=useState(0);
  function fillDemo(){
    if(!demoEnabled||pending||!preserved.ref.current)return;
    const data=createDemoMeasurement(lastDemo.current);lastDemo.current=data;
    const fields=preserved.ref.current.elements;
    fields.namedItem('weight').value=String(data.weight);
    for(const [key,value]of Object.entries(data.values))fields.namedItem('value:'+key).value=String(value);
    for(const key of athlete.fields){const checkbox=fields.namedItem('estimated:'+key);if(checkbox)checkbox.checked=false;}
    setDemoCount(n=>n+1);
  }
  return <form action={action} {...preserved}><input type="hidden" name="member_id" value={memberId}/><input type="hidden" name="record_id" value={recordId}/>
    {demoEnabled&&<section className="card"><h2>架空会員用のデモ入力</h2><p>全測定項目と体重を、押すたびに別のデモ数値へ入れ替えます。入力済みの数値も上書きします。</p><button type="button" onClick={fillDemo} disabled={pending}>デモ数値を入れる</button><p className="muted">ボタンでは保存しません。確認後に下書き保存できます。</p><p role="status" aria-live="polite">{demoCount>0&&`デモ数値を入力しました（${demoCount}回目・${athlete.fields.length}項目）。`}</p></section>}
    <section className="card"><label htmlFor="date">測定日</label><input id="date" name="measured_on" type="date" defaultValue={today} max={today} required/>
      <label htmlFor="weight">測定日の体重（kg・1RM入力時は必須）</label><input id="weight" name="weight" type="number" min="0.01" step="any" inputMode="decimal"/>
      <p>測定しなかった項目は空欄にしてください。0は測定済みとして採点されます。</p></section>
    {Object.entries(categories).map(([cat,label]) => <fieldset className="card" key={cat}><legend>{label}</legend><div className="grid">{athlete.fields.filter(k=>athlete.definitions[k].cat===cat).map(key=>{const d=athlete.definitions[key]; const side=key.endsWith('_R')?' 右':key.endsWith('_L')?' 左':''; return <div key={key}><label htmlFor={key}>{d.name}{side}（{d.unit}）</label>{d.kind==='pts' ? <select id={key} name={`value:${key}`} defaultValue=""><option value="">未測定</option>{[0,1,2,3].filter(v=>v>=(d.min||0)).map(v=><option key={v} value={v}>{v}点{cat==='quality'&&v>0?({1:'：十分に行えない',2:'：制限・途切れあり',3:'：滑らかに行える'})[v]:''}</option>)}</select> : <input id={key} type="number" name={`value:${key}`} min="0" step="any" inputMode="decimal"/>}{d.note&&<p className="muted">{d.note}</p>}{d.est && <label className="check"><input type="checkbox" name={`estimated:${key}`}/>推定1RM</label>}</div>;})}</div></fieldset>)}
    <section className="card"><label htmlFor="comment">本人に公開するコメント（任意）</label><textarea id="comment" name="public_comment" rows={4} maxLength={2000}/><p>保存後の結果画面で確認してから、本人へ公開できます。</p><Feedback state={state}/><button disabled={pending}>{pending?'保存中…':'測定結果を下書き保存'}</button></section>
  </form>;
}
export function PublicationForm({ id, published }) {
  const [state,action,pending]=useActionState(setPublication,null);
  return <form action={action}><input type="hidden" name="record_id" value={id}/><input type="hidden" name="published" value={published?'false':'true'}/><Feedback state={state}/><button disabled={pending}>{pending?'変更中…':published?'本人への公開を取り消す':'確認した結果を本人へ公開する'}</button></form>;
}
