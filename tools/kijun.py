# -*- coding: utf-8 -*-
"""判定基準のマスターを読む共通部分。マスターは docs/判定基準_マスター.csv と docs/判定ルール_マスター.csv。"""
import csv, io, os
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ITEMS_CSV = os.path.join(BASE, 'docs', '判定基準_マスター.csv')
RULES_CSV = os.path.join(BASE, 'docs', '判定ルール_マスター.csv')

# 単位ごとの書き方（thresholds シートの見た目をそろえる）
def fmt(unit, v):
    v = float(v)
    if unit in ('体重比',):      return '%.2f' % v
    if unit in ('RSI',):         return '%.2f' % v
    return ('%g' % v)

def load_items():
    out = []
    with io.open(ITEMS_CSV, encoding='utf-8') as f:
        for r in csv.DictReader(f):
            out.append({
                'key': r['item_key'], 'name': r['項目'], 'cat': r['分類'],
                'unit': r['単位'], 'src': r['信頼度'], 'memo': r['根拠メモ'],
                'M_adult':  (r['成人男_赤'], r['成人男_緑']),
                'F_adult':  (r['成人女_赤'], r['成人女_緑']),
                'M_junior': (r['Jr男_赤'],  r['Jr男_緑']),
                'F_junior': (r['Jr女_赤'],  r['Jr女_緑']),
            })
    return out

def load_rules():
    with io.open(RULES_CSV, encoding='utf-8') as f:
        return [{'key': r['rule_key'], 'name': r['内容'], 'value': r['値'],
                 'unit': r['単位'], 'note': r['意味']} for r in csv.DictReader(f)]

# thresholds シートの category 列（アプリが読む値ではないが、シートの体裁をそろえる）
CATEGORY = {'ジャンプ':'jump', '筋力・体幹部':'strength_core', '筋力・上半身':'strength_upper',
            '筋力・下半身':'strength_lower', 'バランス':'balance'}
