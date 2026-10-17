const levels={red:'要改善',amber:'注意',green:'良好'};
const order={red:0,amber:1,green:2};
export default function ResultInsights({score,rules={}}){
 const j=score.jump??{};
 const rule=(key,fallback)=>rules[key]??fallback;
 const flags=[...(score.flags??[])].sort((a,b)=>(order[a.lv]??3)-(order[b.lv]??3));
 return <><section className="card"><h2>ジャンプの中身</h2>
 {j.ssc&&<div className={`insight ${j.ssc.lv}`}><h3>反動の使い方　SQJ → CMJ {j.ssc.rate}%</h3><p>標準 {rule('sqj_to_cmj_target',10)}%前後</p><p>{j.ssc.text}</p></div>}
 {j.arm&&<div className={`insight ${j.arm.lv}`}><h3>腕振りの連動　CMJ → ABJ {j.arm.rate}%</h3><p>標準 {rule('cmj_to_abj_low',5)}〜{rule('cmj_to_abj_high',11)}%</p><p>{j.arm.text}</p></div>}
 {j.sl&&<><div className="insight"><h3>片脚の目標値　{j.sl.target}cm</h3><p>両脚CMJの{rule('slcmj_target_ratio',50)}%が目標です（許容 ±{rule('slcmj_tolerance',5)}%）。</p>{!j.sl.sides.length&&<p>まだ片脚の測定値がありません。</p>}</div>{j.sl.sides.map((s,i)=><div className={`insight ${s.lv}`} key={i}>{s.text}</div>)}</>}
 {!j.ssc&&!j.arm&&!j.sl&&<p className="muted">分析に必要なジャンプの測定値がまだ揃っていません。</p>}
 </section><section className="card"><h2>気をつけたい点</h2>{flags.length?<ul className="insight-list">{flags.map((f,i)=><li className={`insight ${f.lv}`} key={i}><strong>{levels[f.lv]??'確認'}</strong><span>{f.t}</span></li>)}</ul>:<p>{score.measured?'測定済みの項目では、大きな偏りは見つかりませんでした。':'測定値がまだ入力されていません。'}</p>}{(score.notes??[]).map((note,i)=><p className="muted" key={i}>{note}</p>)}</section></>;
}
