import {tagLabel} from './exercise-tags.mjs';
export const keys=['body_regions','purposes','categories'];
export function normalizeCatalog(raw){
 if(!Array.isArray(raw?.dimensions)||!Array.isArray(raw?.lessons)||!raw.lessons.length)throw Error('Invalid Method Book catalog');
 const dimensions=keys.map(key=>{const d=raw.dimensions.find(d=>d.key===key);if(!d?.label||!Array.isArray(d.tags))throw Error('Invalid dimension');const ids=new Set();return {key,label:String(d.label),tags:d.tags.map(t=>{if(typeof t.id!=='string'||typeof t.label!=='string'||ids.has(t.id))throw Error('Invalid tag');ids.add(t.id);return {id:t.id,label:t.label};})};});
 const ids=new Set();const lessons=raw.lessons.map(l=>{if(typeof l.id!=='string'||typeof l.title!=='string'||ids.has(l.id))throw Error('Invalid lesson');ids.add(l.id);return {id:l.id,title:l.title,keywords:Array.isArray(l.keywords)?l.keywords.filter(k=>typeof k==='string'):[],tags:dimensions.flatMap(d=>(Array.isArray(l.tags?.[d.key])?l.tags[d.key]:[]).filter(id=>d.tags.some(t=>t.id===id)).map(id=>d.key+':'+id))};});
 return {dimensions,lessons};
}
export function fallbackDimensions(lessons){return keys.map((key,i)=>({key,label:['部位','目的','動作／ドリル'][i],tags:[...new Set(lessons.flatMap(l=>l.tags??[]))].filter(t=>t.startsWith(key+':')).map(t=>({id:t.slice(key.length+1),label:tagLabel(t).replace(/^[^：]+：/,'')}))}));}
export function mergeCatalog(lessons,catalog){return lessons.map(l=>{const source=catalog?.lessons.find(s=>s.id===l.id);return source?{...l,title:source.title,tags:source.tags,keywords:source.keywords,sourceMissing:false}:{...l,sourceMissing:!!catalog};});}
export function classification(lesson,dimensions,key){const d=dimensions.find(d=>d.key===key);return (lesson.tags??[]).filter(t=>t.startsWith(key+':')).map(t=>d?.tags.find(x=>key+':'+x.id===t)?.label??tagLabel(t).replace(/^[^：]+：/,'')).join('・');}
export function filterLessons(lessons,dimensions,search,filters){const words=search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);return lessons.filter(l=>!l.sourceMissing&&keys.every(k=>!filters[k]||l.tags.includes(k+':'+filters[k]))&&words.every(w=>[l.title,...(l.keywords??[]),...keys.map(k=>classification(l,dimensions,k))].join(' ').toLocaleLowerCase().includes(w)));}
export function cleanNote(note=''){return note.replace(/^デモ表示確認用のエクササイズです。実施内容・回数は担当トレーナーと確認してください。$/,'');}
