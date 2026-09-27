# -*- coding: utf-8 -*-
"""
マスターから、スプレッドシートの thresholds シートに貼り付ける64行を作る。

    python3 tools/貼り付け用の行を作る.py            # 全部
    python3 tools/貼り付け用の行を作る.py --changed  # 前回コミットから変わった項目だけ

出力はタブ区切り。Googleスプレッドシートにそのまま貼り付けられる。
列の並びは thresholds シートと同じ：
  item_key / item_name / category / sex / age_band / unit / red_max / green_min / direction / source / note
"""
import sys, subprocess, io, csv
sys.path.insert(0, __file__.rsplit('/',1)[0])
from kijun import load_items, CATEGORY, fmt, ITEMS_CSV

# thresholds シートの item_name（アプリは item_key しか見ないが、シートの表記に合わせる）
SHEET_NAME = {
 'abj':'ABJ（腕振りあり）','cmj':'CMJ（反動あり腕振りなし）','sqj':'スクワットジャンプ（反動なし）',
 'sl_cmj':'SLCMJ（片脚・絶対値）','hop_rsi':'ホップテスト（RSI）','drop_rsi':'ドロップジャンプ（RSI）',
 'ab30s':'30秒腹筋','pl_basic':'PLベーシック','pushup':'プッシュアップ','chinup':'懸垂',
 'bp_1rm':'ベンチプレス 1RM','sq_1rm':'スクワット 1RM','dl_1rm':'デッドリフト 1RM',
 'sl_sq':'SLスクワット','sl_stance':'片脚立位','ground_touch_bal':'地面タッチ（バランス）'}
ORDER = [('M','adult'),('M','junior'),('F','adult'),('F','junior')]
COL = {('M','adult'):'M_adult',('M','junior'):'M_junior',('F','adult'):'F_adult',('F','junior'):'F_junior'}

def changed_keys():
    try:
        old = subprocess.check_output(['git','show','HEAD:docs/判定基準_マスター.csv'],
                                      stderr=subprocess.DEVNULL).decode('utf-8')
    except Exception:
        return None
    prev = {r['item_key']: r for r in csv.DictReader(io.StringIO(old))}
    cur  = {r['item_key']: r for r in csv.DictReader(io.open(ITEMS_CSV, encoding='utf-8'))}
    return {k for k in cur if prev.get(k) != cur[k]}

def main():
    only = changed_keys() if '--changed' in sys.argv else None
    items = load_items()
    if only is not None:
        items = [it for it in items if it['key'] in only]
        if not items:
            print('前回コミットから変わった項目はありません。'); return
    rows = []
    for it in items:
        for sex, band in ORDER:
            r, g = it[COL[(sex, band)]]
            rows.append([it['key'], SHEET_NAME.get(it['key'], it['name']),
                         CATEGORY.get(it['cat'], ''), sex, band, it['unit'],
                         fmt(it['unit'], r), fmt(it['unit'], g), 'high', it['src'], it['memo']])
    print('# thresholds シートに貼り付ける %d 行（タブ区切り）' % len(rows))
    print('# 貼り付け先：該当する item_key の行。列の順番はシートと同じです。')
    for row in rows:
        print('\t'.join(str(x) for x in row))

main()
