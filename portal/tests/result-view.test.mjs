import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scoreRecord,historyView} from '../lib/result-view.mjs';
import {candidatePoints,exerciseProposals} from '../lib/exercise-view.mjs';
import {masters} from '../../tests/helpers.mjs';
const row={definition_version:'athlete-v1',values:{cmj:32.5,split:0},age_band:'adult',threshold_sex:'M',estimated_items:[],measured_on:'2026-10-17',id:'1'};
test('推移は保存点を使わず現在の基準と測定当時の条件で計算する',()=>{
 const score=scoreRecord({...row,saved_score:{total:99}},masters());
 assert.notEqual(score.total,99);assert.equal(historyView([row],masters())[0].score.total,score.total);
 assert.equal(scoreRecord({...row,definition_version:'future'},masters()),null);
 assert.equal(scoreRecord(row,null),null);
});
test('教材候補は数値種目の採点を使い、未承認の確認候補と公開可能を分ける',()=>{
 const score=scoreRecord(row,masters());const points=candidatePoints(row,score);
 assert.equal(points.cmj,score.pts.cmj);assert.equal(points.split,0);
 const lessons=[{company_id:'A',id:'demo',title:'架空教材',tags:['hip'],source_approved:false,member_enabled:false}];
 const rules=[{company_id:'A',id:'r',field:'cmj',max_point:3,tags:['hip'],lesson_ids:[],reason:'測定結果を確認',approved:false}];
 assert.equal(exerciseProposals('A',row,score,lessons,rules).length,0);
 lessons[0]={...lessons[0],demo_approved:true,member_enabled:true,member_url:'https://example.test/lesson'};
 const c=exerciseProposals('A',row,score,lessons,rules);
 assert.equal(exerciseProposals('A',{...row,definition_version:'future'},score,lessons,rules).length,0);
 assert.equal(exerciseProposals('A',row,null,lessons,rules).length,0);
 assert.equal(c.length,1);assert.equal(c[0].ruleApproved,false);assert.equal(Boolean(c[0].ready),true);
 assert.equal(exerciseProposals('A',{...row,values:{cmj:0}},scoreRecord({...row,values:{cmj:0}},masters()),lessons,rules).length,0);
});
