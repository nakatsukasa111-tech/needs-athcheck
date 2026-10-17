'use client';
import {useState} from 'react';
import ExerciseForm from './exercise-form';
import {tagLabel} from '../../lib/exercise-tags.mjs';
export default function ExercisePicker({lessons,measurementId,selectedIds}){
 const [search,setSearch]=useState(''),[tag,setTag]=useState(''),[chosen,setChosen]=useState('');
 const tags=[...new Set(lessons.flatMap(l=>l.tags))].sort();
 const visible=lessons.filter(l=>!selectedIds.includes(l.id)&&l.title.toLowerCase().includes(search.toLowerCase())&&(!tag||l.tags.includes(tag)));
 const lesson=visible.find(l=>l.id===chosen);
 return <details><summary>教材一覧から追加する（部位・目的・カテゴリー）</summary><label>教材名で検索<input value={search} onChange={e=>{setSearch(e.target.value);setChosen('');}}/></label><label>分類で絞り込む<select value={tag} onChange={e=>{setTag(e.target.value);setChosen('');}}><option value="">すべての分類</option>{tags.map(t=><option key={t} value={t}>{tagLabel(t)}</option>)}</select></label><label>教材を選択<select value={chosen} onChange={e=>setChosen(e.target.value)}><option value="">{visible.length}件から選択</option>{visible.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select></label>{lesson&&<ExerciseForm key={lesson.id} measurementId={measurementId} lesson={lesson}/>}</details>;
}
