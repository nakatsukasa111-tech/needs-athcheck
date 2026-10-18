'use client';
import {useState} from 'react';
import ExerciseForm from './exercise-form';
import {tagLabel} from '../../lib/exercise-tags.mjs';
export default function ExercisePicker({lessons,measurementId,selectedIds}){
 const [search,setSearch]=useState(''),[tag,setTag]=useState(''),[chosen,setChosen]=useState(''),[tab,setTab]=useState('purposes');
 const tags=[...new Set(lessons.flatMap(l=>l.tags))].filter(t=>tab==='all'||t.startsWith(tab+':')).sort();
 const visible=lessons.filter(l=>!selectedIds.includes(l.id)&&l.title.toLowerCase().includes(search.toLowerCase())&&(!tag||l.tags.includes(tag)));
 const lesson=visible.find(l=>l.id===chosen);
 return <details><summary>エクササイズを選択・追加する</summary><div className="toggles body-tabs" role="group" aria-label="教材の探し方">{[['purposes','目的別'],['body_regions','部位別'],['all','メソッドブック']].map(([key,label])=><button type="button" key={key} aria-pressed={tab===key} onClick={()=>{setTab(key);setTag('');setChosen('');}}>{label}</button>)}</div><label>教材名で検索<input value={search} onChange={e=>{setSearch(e.target.value);setChosen('');}}/></label><label>分類で絞り込む<select value={tag} onChange={e=>{setTag(e.target.value);setChosen('');}}><option value="">すべての分類</option>{tags.map(t=><option key={t} value={t}>{tagLabel(t)}</option>)}</select></label><label>教材を選択<select value={chosen} onChange={e=>setChosen(e.target.value)}><option value="">{visible.length}件から選択</option>{visible.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select></label>{lesson&&<div className="exercise"><h3>{lesson.title}</h3>{lesson.member_url&&<a href={lesson.member_url} target="_blank" rel="noopener noreferrer">教材の内容を見る ↗</a>}<ExerciseForm key={lesson.id} measurementId={measurementId} lesson={lesson}/></div>}</details>;
}
