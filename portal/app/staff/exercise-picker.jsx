'use client';
import {useState} from 'react';
import ExerciseForm from './exercise-form';
import ExerciseHeading from '../exercise-heading';
import {filterLessons} from '../../lib/methodbook-data.mjs';
export default function ExercisePicker({lessons,dimensions,measurementId,selectedIds}){
 const [search,setSearch]=useState(''),[filters,setFilters]=useState({}),[chosen,setChosen]=useState('');
 const available=lessons.filter(l=>!selectedIds.includes(l.id)&&!l.sourceMissing);
 const visible=filterLessons(available,dimensions,search,filters),lesson=visible.find(l=>l.id===chosen);
 return <details className="exercise-picker"><summary>エクササイズを選択・追加する</summary><div className="exercise-search"><label>種目・キーワード<input placeholder="例：股関節、体幹、スクワット" value={search} onChange={e=>{setSearch(e.target.value);setChosen('');}}/></label>{dimensions.map(d=><label key={d.key}>{d.label}<select value={filters[d.key]??''} onChange={e=>{setFilters({...filters,[d.key]:e.target.value});setChosen('');}}><option value="">すべて</option>{d.tags.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>)}<button type="button" onClick={()=>{setSearch('');setFilters({});setChosen('');}}>クリア</button></div><p className="muted">該当{visible.length}件／全{available.length}教材（表示済みを除く）</p><label>教材を選択<select value={chosen} onChange={e=>setChosen(e.target.value)}><option value="">{visible.length}件から選択</option>{visible.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select></label>{lesson&&<article className="exercise"><ExerciseHeading lesson={lesson} dimensions={dimensions}/><p className="exercise-reason">推奨の根拠：担当者が選択</p><ExerciseForm key={lesson.id} measurementId={measurementId} lesson={lesson}/></article>}</details>;
}
