import {sportInput} from '../../src/domain/sports.mjs';
import {getMode,definitions,scoreMode,modeSettings} from './measurement-modes.mjs';
import { createAthleteScorer } from '../../src/domain/athlete-scoring.mjs';

export const athlete = createAthleteScorer();
export const categories = { flex: '柔軟性', balance: 'バランス', strength: '筋力', jump: 'ジャンプ', quality: '動きの質' };
export function todayJapan() { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date()); }
export function dateValue(value, label, today = todayJapan()) {
  const date = String(value ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || date > today || date < '1900-01-01') throw new Error(`${label}を正しい日付で入力してください。`);
  return date;
}
export function memberInput(form) {
  const display_name = String(form.get('display_name') ?? '').trim();
  if (!display_name || display_name.length > 100) throw new Error('氏名は1〜100文字で入力してください。');
  const birth_date = dateValue(form.get('birth_date'), '生年月日');
  const threshold_sex = String(form.get('threshold_sex') ?? '');
  if (!['M', 'F'].includes(threshold_sex)) throw new Error('評価基準の性別を選択してください。');
  const external_customer_no = String(form.get('external_customer_no') ?? '').trim();
  if (external_customer_no.length > 100) throw new Error('外部顧客番号は100文字以内で入力してください。');
  return { ...sportInput(form), display_name, birth_date, threshold_sex, external_customer_no: external_customer_no || null };
}
export function measurementInput(form, member, settings) {
  const measured_on = dateValue(form.get('measured_on'), '測定日');
  const birth = dateValue(member.birth_date, '会員の生年月日');
  if (measured_on < birth) throw new Error('測定日は生年月日以降にしてください。');
  if (!['M', 'F'].includes(member.threshold_sex)) throw new Error('会員の評価基準の性別が未登録です。');
  if (!settings) throw new Error('会社の評価基準が未設定です。管理者に確認してください。');
  const mode=getMode(String(form.get('measurement_mode') ?? 'athlete'));
  const selectedSettings=modeSettings(settings,mode.id);
  const scorer = createAthleteScorer(selectedSettings);
  const age = Number(measured_on.slice(0, 4)) - Number(birth.slice(0, 4)) - (measured_on.slice(5) < birth.slice(5) ? 1 : 0);
  const age_band = scorer.ageBand(age);
  const values = {}; const estimated_items = [];
  for (const key of mode.fields) {
    const text = String(form.get(`value:${key}`) ?? '').trim();
    if (!text) continue;
    const n = Number(text); const def = definitions[key];
    if (!Number.isFinite(n) || n < (def.min||0) || (def.kind === 'pts' && (!Number.isInteger(n) || n > 3))) throw new Error(`${def.name}は${def.kind === 'pts' ? `${def.min||0}〜3の整数` : '0以上の数値'}で入力してください。`);
    if(def.integer&&!Number.isSafeInteger(n))throw new Error(`${def.name}は0以上の整数で入力してください。`);
    values[key] = n;
    if (def.est && form.get(`estimated:${key}`) === 'on') estimated_items.push(key);
  }
  if (!Object.keys(values).length) throw new Error('少なくとも1項目を入力してください。空欄は未測定として扱います。');
  const weightText = String(form.get('weight') ?? '').trim();
  const weight = weightText === '' ? null : Number(weightText);
  if (weight !== null && (!Number.isFinite(weight) || weight <= 0)) throw new Error('体重は0より大きい数値で入力してください。');
  if (Object.keys(values).some(k => definitions[k].bw) && weight === null) throw new Error('1RMの採点には測定日の体重が必要です。');
  const bands = age_band === 'elementary' ? ['elementary', 'junior', 'adult'] : age_band === 'junior' ? ['junior', 'adult'] : ['adult', 'junior'];
  for (const key of Object.keys(values)) {
    const def = definitions[key];
    if (def.kind === 'num' && !def.unscored && !bands.some(band => selectedSettings.thresholds?.[`${def.key}|${member.threshold_sex}|${band}`])) throw new Error(`${def.name}の評価基準が未設定です。`);
  }
  const public_comment = String(form.get('public_comment') ?? '').trim();
  if (public_comment.length > 2000) throw new Error('公開コメントは2000文字以内で入力してください。');
  const saved_score = scoreMode(values, { sex: member.threshold_sex, band: age_band, weight: weight ?? undefined, est: Object.fromEntries(estimated_items.map(k => [k, true])) },selectedSettings,mode.id);
  if(mode.id!=='athlete')saved_score.configuration={version:mode.version,source:'athlete-shared-v1',settings:structuredClone(selectedSettings)};
  return { measured_on, values, weight, estimated_items, age_band, threshold_sex: member.threshold_sex, definition_version: mode.version, saved_score, public_comment, published: false };
}
