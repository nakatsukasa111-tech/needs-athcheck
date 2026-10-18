// 候補の抽出のみ。会員への公開は、将来のサーバー処理でトレーナーが確定する。
// catalog / rules はサーバーが閲覧権限を確認したものを渡す。
// タグは表示名ではなくIDを使う。実教材の対応ルールは監修後に登録する。
export function proposeExerciseCandidates({ companyId, values, catalog, rules }) {
  if (typeof companyId !== 'string' || !companyId.trim()) throw new Error('会社を指定してください');
  const byId = new Map();
  for (const lesson of catalog) {
    if (byId.has(lesson.id)) throw new Error(`教材IDが重複しています: ${lesson.id}`);
    byId.set(lesson.id, lesson);
  }
  const candidates = new Map();
  const groups = [];
  const orderedRules = rules.filter(r => r.companyId === companyId && r.enabled === true && r.approved === true)
    .sort((a, b) => (values[a.field] ?? 4) - (values[b.field] ?? 4) || (a.priority ?? 100) - (b.priority ?? 100) || a.id.localeCompare(b.id));
  for (const rule of orderedRules) {
    const value = values[rule.field];
    // 空欄・未測定は悪い結果として扱わない。0点は初期段階では人の判断に戻す。
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue;
    if (!Number.isFinite(rule.maxInclusive) || value > rule.maxInclusive) continue;
    // 少なくともタグまたは教材IDを明示する。空の条件で全教材を選ばない。
    const ids = rule.lessonIds ?? [];
    const tags = rule.requiredTags ?? [];
    if (!ids.length && !tags.length) continue;
    const limit = Number.isInteger(rule.limit) && rule.limit > 0 ? Math.min(rule.limit, 5) : 5;
    const lessons = catalog.filter(lesson =>
      lesson.companyId === companyId && lesson.reviewStatus === 'approved' &&
      lesson.memberVisible === true && lesson.kind === 'exercise' &&
      (!ids.length || ids.includes(lesson.id)) &&
      tags.every(tag => (lesson.tags ?? []).includes(tag)),
    ).sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100) || a.id.localeCompare(b.id))
      .slice(0, limit);
    groups.push(lessons.map(l=>l.id));
    for (const lesson of lessons) {
      const reason = { ruleId: rule.id, field: rule.field, value, text: rule.reason };
      const existing = candidates.get(lesson.id);
      if (existing) existing.reasons.push(reason);
      else candidates.set(lesson.id, { lessonId: lesson.id, title: lesson.title,
        status: 'candidate', requiresTrainerApproval: true, reasons: [reason] });
    }
  }
  // Take one candidate from each matching observation before filling remaining slots.
  const ordered=[];
  for(let i=0;i<5;i++)for(const ids of groups){const id=ids[i];if(id&&!ordered.includes(id))ordered.push(id);}
  return ordered.slice(0,5).map(id=>candidates.get(id));
}
