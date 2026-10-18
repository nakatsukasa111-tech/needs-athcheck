'use client';
import {useState} from 'react';
import {sports} from '../../../src/domain/sports.mjs';
export default function SportFields({profile={}}){
 const [sport,setSport]=useState(profile.sport??'');
 return <fieldset><legend>競技プロフィール</legend><input type="hidden" name="sport" value={sport}/><div className="toggles body-tabs" role="group" aria-label="競技を選択">{sports.map(([id,label])=><button type="button" key={id} aria-pressed={sport===id} onClick={()=>setSport(id)}>{label}</button>)}</div>{sport==='other'&&<label>その他の競技名<input name="sport_other" required maxLength={100} defaultValue={profile.sport_other??''}/></label>}{sport==='baseball'&&<label>主な役割<select name="sport_role" defaultValue={profile.sport_role??'batter'}><option value="batter">野手・打者</option><option value="pitcher">投手</option><option value="both">投手・野手の両方</option></select></label>}<div className="grid"><label>利き手・投げる側<select name="throwing_hand" defaultValue={profile.throwing_hand??'R'}><option value="R">右</option><option value="L">左</option></select></label><label>打つ側<select name="batting_hand" defaultValue={profile.batting_hand??'R'}><option value="R">右打ち</option><option value="L">左打ち</option></select></label></div></fieldset>;
}
