'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {completedNumber,keypadValue} from '../../lib/measurement-entry.mjs';

export function MeasurementNumber({id,name,label,unit,integer=false,disabled=false,defaultValue=''}){
 return <input className="measurement-number" id={id} name={name} type="text" inputMode="none" readOnly defaultValue={defaultValue} disabled={disabled} placeholder="タップして入力" aria-label={`${label}（${unit}）`} aria-haspopup="dialog" data-measure-number={label} data-unit={unit} data-integer={integer?'true':'false'}/>;
}
export default function MeasurementKeypad(){
 const anchor=useRef(null),dialog=useRef(null),target=useRef(null),firstDigit=useRef(true);
 const [entry,setEntry]=useState(null),[value,setValue]=useState('');
 function open(input){target.current=input;firstDigit.current=true;setValue(input.value);setEntry({label:input.dataset.measureNumber,unit:input.dataset.unit,integer:input.dataset.integer==='true'});}
 useEffect(()=>{
  const form=anchor.current.closest('form');
  const click=e=>{const input=e.target.closest('input[data-measure-number]');if(input&&!input.disabled)open(input);};
  const key=e=>{if(e.target.matches('input[data-measure-number]')&&['Enter',' '].includes(e.key)){e.preventDefault();open(e.target);}};
  form.addEventListener('click',click);form.addEventListener('keydown',key);
  return()=>{form.removeEventListener('click',click);form.removeEventListener('keydown',key);};
 },[]);
 useEffect(()=>{if(entry&&!dialog.current.open)dialog.current.showModal();},[entry]);
 function press(key){if(key==='.'&&entry.integer)return;const replace=firstDigit.current;setValue(v=>keypadValue(v,key,{integer:entry.integer,replace}));firstDigit.current=false;}
 function commit(){
  const input=target.current;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,completedNumber(value));
  input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
 }
 function close(save){if(save)commit();dialog.current.close();setEntry(null);target.current?.focus({preventScroll:true});}
 function next(){
  commit();const inputs=[...target.current.form.querySelectorAll('input[data-measure-number]:not(:disabled)')];const next=inputs[inputs.indexOf(target.current)+1];
  if(next)open(next);else close(false);
 }
 function keyboard(e){
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(/^\d$/.test(e.key)||['.','Backspace','Delete'].includes(e.key)){e.preventDefault();press(e.key==='Backspace'?'backspace':e.key==='Delete'?'clear':e.key);}
  else if(e.key==='Enter'&&e.target.tagName!=='BUTTON'){e.preventDefault();next();}
 }
 return <><span ref={anchor}/>{entry&&createPortal(<dialog ref={dialog} className="measurement-keypad" aria-labelledby="keypad-heading" onCancel={e=>{e.preventDefault();close(false);}} onKeyDown={keyboard}>
  <div className="keypad-heading"><div><small>数値を入力</small><h2 id="keypad-heading">{entry.label}<span>（{entry.unit}）</span></h2></div><button type="button" onClick={()=>close(false)}>キャンセル</button></div>
  <div className="keypad-display" aria-live="polite"><output aria-label="入力中の数値">{value===''?'未測定':value}</output><span>{entry.unit}</span></div>
  <p className="keypad-hint">最初の数字で入力済みの値を置き換えます。削除キーで末尾を修正できます。</p>
  <div className="keypad-grid">{['7','8','9','4','5','6','1','2','3','.','0','backspace'].map(k=><button type="button" key={k} disabled={k==='.'&&entry.integer} aria-label={k==='backspace'?'1文字削除':k==='.'?'小数点':k} onClick={()=>press(k)}>{k==='backspace'?'⌫':k}</button>)}</div>
  <button type="button" className="keypad-clear" onClick={()=>press('clear')}>未測定に戻す</button>
  <div className="keypad-actions"><button type="button" onClick={next}>次へ →</button><button type="button" onClick={()=>close(true)}>完了</button></div>
 </dialog>,document.body)}</>;
}
