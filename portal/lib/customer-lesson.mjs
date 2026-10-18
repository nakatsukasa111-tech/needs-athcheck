const origin='https://project-iqw46.vercel.app/';
const text=v=>typeof v==='string'?v:'';
const editorial=/監修前|スタッフ確認用|未設定|指導意図を確認|（仮）/;
export function mediaUrl(value){try{const u=new URL(value,origin);return typeof value==='string'&&u.origin===new URL(origin).origin&&u.pathname.startsWith('/assets/')?u.href:null;}catch{return null;}}
export function customerLesson(raw){
 if(!raw||typeof raw.id!=='string'||typeof raw.title!=='string')return null;
 const c=raw.customer??{},m=raw.media?.demo;
 return {id:raw.id,title:raw.title,steps:(Array.isArray(c.steps)?c.steps:[]).filter(s=>Array.isArray(s)&&s.length===2&&!editorial.test(text(s[0])+text(s[1]))).map(s=>[text(s[0]).replace('（映像より）',''),text(s[1])]),cue:editorial.test(text(c.cue))?'':text(c.cue),dosage:editorial.test(text(c.dosage))?'':text(c.dosage),caution:editorial.test(text(c.caution))?'':text(c.caution),video:mediaUrl(m?.src),poster:mediaUrl(m?.poster)};
}
export function customerLessonHref(lessonId,measurementId){return '/exercises/'+encodeURIComponent(lessonId)+'?measurement='+encodeURIComponent(measurementId);}
