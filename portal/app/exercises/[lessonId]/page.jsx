import Link from 'next/link';
import {notFound} from 'next/navigation';
import {requireUser} from '../../../lib/supabase';
import {getCustomerLesson} from '../../../lib/methodbook';
import {cleanNote} from '../../../lib/methodbook-data.mjs';
export const dynamic='force-dynamic';
export default async function CustomerExercise({params,searchParams}){
 const {lessonId}=await params,{measurement}=await searchParams;
 if(typeof measurement!=='string'||!/^[-a-f0-9]{36}$/i.test(measurement))notFound();
 const {db,user}=await requireUser();
 const result=await db.from('athlete_measurements').select('id,company_id,member_id,published').eq('id',measurement).maybeSingle();
 if(result.error)throw Error('測定を確認できませんでした');if(!result.data)notFound();const row=result.data;
 const role=await db.from('athlete_staff').select('company_id').eq('user_id',user.id).eq('company_id',row.company_id).eq('active',true);if(role.error)throw Error('閲覧権限を確認できませんでした');const staff=!!role.data?.length;
 const assignment=await db.from('athlete_exercise_assignments').select('confirmed,trainer_note').eq('measurement_id',measurement).eq('company_id',row.company_id).eq('lesson_id',lessonId).maybeSingle();if(assignment.error)throw Error('推奨教材を確認できませんでした');
 if(!staff){const access=await db.from('athlete_member_access').select('member_id').eq('user_id',user.id).eq('member_id',row.member_id).eq('active',true);if(access.error)throw Error('閲覧権限を確認できませんでした');if(!access.data?.length||!row.published||!assignment.data?.confirmed)notFound();}
 const saved=await db.from('athlete_lessons').select('id,title,member_enabled,source_approved,demo_approved').eq('id',lessonId).eq('company_id',row.company_id).maybeSingle();if(saved.error)throw Error('教材を確認できませんでした');if(!saved.data||!saved.data.member_enabled||!(saved.data.source_approved||saved.data.demo_approved))notFound();
 const lesson=await getCustomerLesson(lessonId),back=(staff?'/staff/results/':'/mypage/results/')+measurement;
 return <><Link href={back}>測定結果に戻る</Link><section className="card customer-lesson"><p className="eyebrow">NeeDS Method Book · お客様モード</p><h1>{lesson?.title??saved.data.title}</h1>{!lesson?<p role="status">教材を読み込めませんでした。時間をおいて再読み込みしてください。</p>:<><div className="customer-lesson-layout"><div>{lesson.video?<video controls playsInline preload="metadata" poster={lesson.poster??undefined} src={lesson.video} aria-label={lesson.title+' 実演動画'}/>:<p>動画を準備しています。</p>}</div><div><h2>実施手順</h2>{lesson.steps.length?<ol>{lesson.steps.map(([title,body],i)=><li key={i}><strong>{title}</strong><p>{body}</p></li>)}</ol>:<p>実施方法は担当トレーナーと確認してください。</p>}{lesson.cue&&<><h2>動きのポイント</h2><p>{lesson.cue}</p></>}</div></div><h2>回数・頻度／担当者からの説明</h2><p>{cleanNote(assignment.data?.trainer_note)||lesson.dosage||'回数・頻度は担当トレーナーと確認してください。'}</p>{lesson.caution&&<p>{lesson.caution}</p>}<p className="muted">※実施内容、回数は担当トレーナーと確認してください</p></>}</section></>;
}
