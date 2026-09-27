# -*- coding: utf-8 -*-
"""
いまアプリが使っている判定基準を、1枚の見直し用シートにまとめる。

    python3 tools/判定基準の見直しシートを作る.py

出力： docs/NeeDS_判定基準_見直し用.xlsx

数値のマスターは docs/判定基準_マスター.csv と docs/判定ルール_マスター.csv。
数値を変えるときはマスターCSVを直し、このスクリプトを流し直す。
"""
import os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kijun import load_items, load_rules

# 数値のマスターは docs/判定基準_マスター.csv と docs/判定ルール_マスター.csv。
# このファイルには数値を書かないこと（2か所に持つとズレる）。
ITEMS = [(it['key'], it['name'], it['cat'], it['unit'], it['src'],
          tuple(float(x) if '.' in str(x) else int(x) for x in it['M_adult']),
          tuple(float(x) if '.' in str(x) else int(x) for x in it['F_adult']),
          tuple(float(x) if '.' in str(x) else int(x) for x in it['M_junior']),
          tuple(float(x) if '.' in str(x) else int(x) for x in it['F_junior']),
          it['memo']) for it in load_items()]
RULES = [(r['key'], r['name'],
          float(r['value']) if '.' in str(r['value']) else int(r['value']),
          r['unit'], r['note']) for r in load_rules()]

FLEX = [('上半身','バンザイ','あり'),('上半身','結帯動作','あり'),('上半身','肩関節外旋','あり'),
        ('体幹部','体幹回旋','あり'),('体幹部','体幹側屈','あり'),('体幹部','ブリッジ','なし'),
        ('下半身','開脚','なし'),('下半身','ASLR','あり'),('下半身','地面タッチ（柔軟）','なし')]
QUALITY = ['スクワット','スライドスクワット','ローテーションスクワット','ローテーションドリル 上','ローテーションドリル 下']

BASIS = [
 ('跳躍高 女性 = 男性 × 0.78','各国代表選手1,577名の調査で、CMJの男女差は競技カテゴリー平均で8〜12cm、男性が平均33%高い。他の研究でも男性が10〜26%高いと報告。逆算して女性は男性の約0.75〜0.80倍'),
 ('RSI 女性 = 男性 × 0.80','チームスポーツ選手のRSI報告値は男性0.89〜2.04、女性0.58〜1.67。比率にすると約0.75〜0.82'),
 ('跳躍高 ジュニア男子 = 成人男性 × 0.85','9〜17.9歳男子の跳躍高50パーセンタイルは24.0〜38.0cmで年齢とともに直線的に増加。中学〜高校前半の中央値は成人値の8割強'),
 ('跳躍高 ジュニア女子 = 成人女性 × 0.90','同調査の女子は50パーセンタイルが22.3〜27.0cmと早期に頭打ち。思春期以降の伸びが小さいため係数を高めに設定'),
 ('1RM 上半身 女性 = 男性 × 0.65','一般的な筋力基準では、女性の上腕系種目（ベンチプレス等）は男性の60〜70%とされる'),
 ('1RM 下半身 女性 = 男性 × 0.80','スクワット・デッドリフト等の下半身種目は男性の75〜85%とされる'),
 ('1RM ジュニア = 成人 × 0.70','骨端線が閉じていない年代の最大挙上重量は成人比で大きく下がる。安全側に倒して0.70'),
 ('体幹持久 女性 = 男性 × 0.90','腹筋・プランク系は男女差が最も小さい種目群のため係数を高く設定'),
 ('片脚立位・地面タッチ・PLベーシック','NeeDS独自プロトコルのため参照できる文献がない。実測データが数十件たまった時点で、その分布から引き直す前提'),
]

INK='FF16202B'; SUB='FF5B6875'; LINE='FFD3D7DC'
HEAD=PatternFill('solid', fgColor='FF16202B')
EDIT=PatternFill('solid', fgColor='FFFFF6DC')      # 編集していい場所
LOCK=PatternFill('solid', fgColor='FFF1F3F5')      # 現行値（さわらない）
GRP =PatternFill('solid', fgColor='FFE8EDF2')
thin=Side(style='thin', color=LINE)
BOX=Border(left=thin,right=thin,top=thin,bottom=thin)

def head(ws, row, vals, fill=HEAD, color='FFFFFFFF'):
    for i,v in enumerate(vals, start=1):
        c=ws.cell(row=row, column=i, value=v)
        c.fill=fill; c.font=Font(bold=True, color=color, size=10)
        c.alignment=Alignment(horizontal='center', vertical='center', wrap_text=True)
        c.border=BOX

wb=Workbook()

# ================= ① 判定一覧（編集用） =================
ws=wb.active; ws.title='① 判定一覧（編集用）'
ws['A1']='NeeDS フィジカルチェック 判定基準の見直しシート'
ws['A1'].font=Font(bold=True, size=14, color=INK)
ws['A2']=('赤の列＝ここが「赤（要改善）」の上限。緑の列＝ここから「緑（良好）」。その間が黄。'
          '　左側の灰色＝いまの値（さわらない）／右側の黄色＝新しい値（ここを書き換える）')
ws['A2'].font=Font(size=10, color=SUB)
ws['A3']=('黄色の欄には、いまの値をあらかじめ入れてあります。変えたいところだけ上書きしてください。'
          '空欄にすると「未設定」になってしまうので、消さないでください。')
ws['A3'].font=Font(size=10, color='FFC7453F')

r=5
head(ws, r, ['分類','項目','単位','信頼度',
             '成人男 赤','成人男 緑','成人女 赤','成人女 緑','Jr男 赤','Jr男 緑','Jr女 赤','Jr女 緑',
             '★成人男 赤','★成人男 緑','★成人女 赤','★成人女 緑','★Jr男 赤','★Jr男 緑','★Jr女 赤','★Jr女 緑',
             'いまの根拠','変えたい理由（メモ）'])
ws.cell(row=r-1, column=5, value='いまの値（参照用）').font=Font(bold=True, size=10, color=SUB)
ws.cell(row=r-1, column=13, value='★ 新しい値（ここを書き換える）').font=Font(bold=True, size=10, color='FFB8860B')

r+=1
prev=None
for key,name,cat,unit,src,ma,fa,mj,fj,memo in ITEMS:
    vals=[cat if cat!=prev else '', name, unit, src,
          ma[0],ma[1], fa[0],fa[1], mj[0],mj[1], fj[0],fj[1],
          ma[0],ma[1], fa[0],fa[1], mj[0],mj[1], fj[0],fj[1],
          memo, '']
    prev=cat
    for i,v in enumerate(vals, start=1):
        c=ws.cell(row=r, column=i, value=v)
        c.border=BOX
        c.font=Font(size=10, color=INK)
        if i<=4: c.alignment=Alignment(vertical='center', wrap_text=(i==4))
        elif i<=12: c.fill=LOCK; c.alignment=Alignment(horizontal='center')
        elif i<=20: c.fill=EDIT; c.alignment=Alignment(horizontal='center')
        else: c.alignment=Alignment(vertical='top', wrap_text=True); c.font=Font(size=9, color=SUB)
        if i==21: c.fill=PatternFill('solid', fgColor='FFFAFBFC')
        if i==22: c.fill=EDIT
    ws.row_dimensions[r].height=32
    r+=1

for col,w in zip('ABCDEFGHIJKLMNOPQRSTUV',
                 [13,24,7,13, 9,9,9,9,9,9,9,9, 9,9,9,9,9,9,9,9, 52,26]):
    ws.column_dimensions[col].width=w
ws.freeze_panes='E6'

# ================= ② 区分の比率 =================
ws2=wb.create_sheet('② 区分の比率')
ws2['A1']='成人男性を100としたときの比率'
ws2['A1'].font=Font(bold=True, size=14, color=INK)
ws2['A2']='「何%ダウンにするか」を決めるときの参考。ジュニア女子は、成人女性からの比率も併記。'
ws2['A2'].font=Font(size=10, color=SUB)
head(ws2, 4, ['項目','単位','成人女 赤','成人女 緑','Jr男 赤','Jr男 緑','Jr女 赤','Jr女 緑','Jr女/成人女 赤','Jr女/成人女 緑'])
r=5
def pc(a,b): return '—' if not b else round(a/b*100)
for key,name,cat,unit,src,ma,fa,mj,fj,memo in ITEMS:
    vals=[name,unit, pc(fa[0],ma[0]),pc(fa[1],ma[1]), pc(mj[0],ma[0]),pc(mj[1],ma[1]),
          pc(fj[0],ma[0]),pc(fj[1],ma[1]), pc(fj[0],fa[0]),pc(fj[1],fa[1])]
    for i,v in enumerate(vals, start=1):
        c=ws2.cell(row=r, column=i, value=(v if isinstance(v,str) else v))
        c.border=BOX; c.font=Font(size=10, color=INK)
        if i>=3:
            c.alignment=Alignment(horizontal='center')
            c.number_format='0"%"'
    r+=1
for col,w in zip('ABCDEFGHIJ',[26,7,11,11,11,11,11,11,14,14]): ws2.column_dimensions[col].width=w
ws2.freeze_panes='C5'

# ================= ③ 閾値を使わない項目 =================
ws3=wb.create_sheet('③ 閾値を使わない項目')
ws3['A1']='トレーナーが0〜3点でつける項目（男女・年代の区別なし）'
ws3['A1'].font=Font(bold=True, size=14, color=INK)
ws3['A2']=('この20項目は閾値表を使いません。トレーナーが目で見て0〜3点をつけます。'
           'そのため男女・大人/ジュニアで基準が分かれていません。')
ws3['A2'].font=Font(size=10, color=SUB)
ws3['A3']='0点は「怪我などで測定不能」「痛みはないが病的な硬さがある」とき。左右がある種目は低いほうを採用します。'
ws3['A3'].font=Font(size=10, color=SUB)
head(ws3, 5, ['部門','部位','項目','左右'])
r=6
for part,name,lr in FLEX:
    for i,v in enumerate(['柔軟性',part,name,lr], start=1):
        c=ws3.cell(row=r,column=i,value=v); c.border=BOX; c.font=Font(size=10,color=INK)
    r+=1
for name in QUALITY:
    for i,v in enumerate(['動きの質','',name,'なし'], start=1):
        c=ws3.cell(row=r,column=i,value=v); c.border=BOX; c.font=Font(size=10,color=INK)
    r+=1
r+=1
ws3.cell(row=r, column=1, value='色の境目（得点率）').font=Font(bold=True, size=11, color=INK)
r+=1
for label,val in [('緑（良好）','88.9% 以上'),('黄（普通）','66.7% 以上'),('赤（要改善）','66.7% 未満')]:
    ws3.cell(row=r,column=1,value=label).font=Font(size=10,color=INK)
    ws3.cell(row=r,column=2,value=val).font=Font(size=10,color=INK)
    r+=1
ws3.cell(row=r+1, column=1,
  value='※ この境目は下の「④ rules」で変えられます。閾値を使う項目にも同じ比率を使っています。').font=Font(size=10,color=SUB)
for col,w in zip('ABCD',[12,12,28,8]): ws3.column_dimensions[col].width=w

# ================= ④ rules =================
ws4=wb.create_sheet('④ 点数以外の判定（rules）')
ws4['A1']='点数以外の判定に使っている数値'
ws4['A1'].font=Font(bold=True, size=14, color=INK)
ws4['A2']='左右差のフラグ、ジャンプの伸び率の基準、ジュニアの境界など。黄色の欄を書き換えてください。'
ws4['A2'].font=Font(size=10, color=SUB)
head(ws4, 4, ['rule_key','内容','いまの値','単位','★新しい値','意味'])
r=5
for key,name,val,unit,note in RULES:
    for i,v in enumerate([key,name,val,unit,val,note], start=1):
        c=ws4.cell(row=r,column=i,value=v); c.border=BOX; c.font=Font(size=10,color=INK)
        if i==3: c.fill=LOCK; c.alignment=Alignment(horizontal='center')
        if i==5: c.fill=EDIT; c.alignment=Alignment(horizontal='center')
        if i==6: c.alignment=Alignment(vertical='top', wrap_text=True); c.font=Font(size=9,color=SUB)
        if i==1: c.font=Font(size=9, color=SUB)
    ws4.row_dimensions[r].height=30
    r+=1
for col,w in zip('ABCDEF',[20,28,11,8,12,56]): ws4.column_dimensions[col].width=w

# ================= ⑤ 係数の根拠 =================
ws5=wb.create_sheet('⑤ いまの係数の根拠')
ws5['A1']='いまの女性・ジュニアの値をどう出したか'
ws5['A1'].font=Font(bold=True, size=14, color=INK)
ws5['A2']='成人男性の ABJ・CMJ・SQJ・RSI・ベンチプレス だけが指定値。それ以外はすべて下の係数で算出した仮置きです。'
ws5['A2'].font=Font(size=10, color=SUB)
head(ws5, 4, ['係数','根拠'])
r=5
for k,v in BASIS:
    a=ws5.cell(row=r,column=1,value=k); a.border=BOX; a.font=Font(bold=True,size=10,color=INK)
    a.alignment=Alignment(vertical='top', wrap_text=True)
    b=ws5.cell(row=r,column=2,value=v); b.border=BOX; b.font=Font(size=10,color=INK)
    b.alignment=Alignment(vertical='top', wrap_text=True)
    ws5.row_dimensions[r].height=46
    r+=1
ws5.column_dimensions['A'].width=34; ws5.column_dimensions['B'].width=92

os.makedirs('docs', exist_ok=True)
out='docs/NeeDS_判定基準_見直し用.xlsx'
wb.save(out)
print('書き出しました:', out)
