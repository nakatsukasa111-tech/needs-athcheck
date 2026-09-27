# -*- coding: utf-8 -*-
"""
いまアプリが使っている判定基準を、1枚の見直し用シートにまとめる。

    python3 tools/判定基準の見直しシートを作る.py

出力： docs/NeeDS_判定基準_見直し用.xlsx
中身は Googleスプレッドシート「NeeDS フィジカルチェック データ」の
thresholds / rules シート（2026-09-27 時点）と、閾値マスタv1のREADMEから起こしている。
数値を変えたら、このファイルの ITEMS / RULES も直すこと。
"""
import os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# item_key, 項目, 分類, 単位, 信頼度, (成人男 赤,緑), (成人女), (Jr男), (Jr女), 根拠メモ
ITEMS = [
 ('abj','ABJ（腕振りあり）','ジャンプ','cm','指定値＋係数',(39,55),(30,43),(33,47),(27,39),
  '成人男性は中務さんの指定値。女性=×0.78、Jr男=成人男×0.85、Jr女=成人女×0.90'),
 ('cmj','CMJ（反動あり・腕振りなし）','ジャンプ','cm','指定値＋係数',(35,49),(27,38),(30,42),(24,34),
  '成人男性はABJの10%減（指定ルール）。伸張反射の活用度を見る'),
 ('sqj','SQJ（反動なし）','ジャンプ','cm','指定値＋係数',(31,44),(24,34),(26,37),(22,30),
  '成人男性はCMJのさらに10%減（指定ルール）。筋力由来の跳躍力を見る'),
 ('sl_cmj','SLCMJ（片脚・絶対値）','ジャンプ','cm','仮置き',(17,24),(13,19),(15,21),(12,17),
  '両脚CMJの緑ラインの約半分。対CMJ比の判定とは別に絶対値でも見る。左右それぞれに適用'),
 ('hop_rsi','ホップテスト（RSI）','ジャンプ','RSI','指定値＋係数',(1.89,2.60),(1.49,2.10),(1.59,2.20),(1.39,1.90),
  '両足実施。成人男性は指定値。女性=×0.80。3.1以上は緑のまま「非常に良い」と表示'),
 ('drop_rsi','ドロップジャンプ（RSI）','ジャンプ','RSI','指定値＋係数',(1.89,2.60),(1.49,2.10),(1.59,2.20),(1.39,1.90),
  'ホップと同基準。両者の差が15%以上でフラグ'),
 ('ab30s','30秒腹筋','筋力・体幹部','回','仮置き',(20,28),(16,24),(17,25),(14,22),
  '60秒腹筋の一般基準を30秒に換算。体幹持久は男女差が小さいため係数0.90'),
 ('pl_basic','PLベーシック','筋力・体幹部','回','仮置き',(14,25),(12,22),(12,22),(10,20),
  '3種目通算・30回満点。満点を基準に按分したNeeDS独自基準'),
 ('pushup','プッシュアップ','筋力・体幹部','回','仮置き',(20,35),(10,20),(14,25),(7,15),
  '成人の一般基準（男性20代で平均17〜29回）を参考に、アスリート想定でやや高め'),
 ('chinup','懸垂','筋力・上半身','回','仮置き',(5,12),(1,5),(3,9),(0,3),
  '自体重種目のため体重比の影響が大きい。女性は0回が珍しくないため下限を低く設定'),
 ('bp_1rm','ベンチプレス 1RM','筋力・上半身','体重比','指定値＋係数',(0.80,1.21),(0.52,0.79),(0.56,0.85),(0.36,0.55),
  '成人男性は指定値。女性=上半身係数0.65、ジュニア=0.70'),
 ('sq_1rm','スクワット 1RM','筋力・下半身','体重比','仮置き',(1.20,1.75),(0.96,1.40),(0.84,1.23),(0.67,0.98),
  '一般基準で成人男性の中級が体重比1.5倍・上級2.0倍。女性=下半身係数0.80'),
 ('dl_1rm','デッドリフト 1RM','筋力・下半身','体重比','仮置き',(1.50,2.00),(1.20,1.60),(1.05,1.40),(0.84,1.12),
  '一般基準で成人男性の中級が体重比2.0倍。ジュニアの実施可否は現場判断'),
 ('sl_sq','SLスクワット','筋力・下半身','回','仮置き',(5,12),(4,10),(4,10),(3,8),
  '左右それぞれに適用。左右差10%以上でフラグ'),
 ('sl_stance','片脚立位','バランス','秒','要確認（文献なし）',(29,60),(29,60),(29,60),(29,60),
  'NeeDS独自。60秒上限と仮定。いまは男女・年代差をつけていない'),
 ('ground_touch_bal','地面タッチ（バランス）','バランス','回','要確認（文献なし）',(5,10),(5,9),(4,9),(4,8),
  'NeeDS独自。制限時間内の回数と仮定した仮置き。左右それぞれに適用'),
]

RULES = [
 ('flex_green_min','柔軟性・動きの質 緑の下限',88.9,'%','満点に対する得点率。3種目9点満点なら8点以上が緑'),
 ('flex_yellow_min','柔軟性・動きの質 黄の下限',66.7,'%','同6点以上が黄、それ未満が赤'),
 ('flex_lr_yellow','柔軟性 左右差 黄フラグ',1,'点差','左右で1点差があれば黄フラグ'),
 ('flex_lr_red','柔軟性 左右差 赤フラグ',2,'点差','2点以上の差で赤フラグ。総合スコアには加算しない'),
 ('sqj_to_cmj_target','SQJ→CMJ 標準の伸び率',10,'%','差がほぼ無い＝伸張反射が使えていない。大きく超える＝筋力不足'),
 ('cmj_to_abj_low','CMJ→ABJ 連動不全の上限',5,'%','これ未満なら腕振り・上半身の連動が機能していない'),
 ('cmj_to_abj_high','CMJ→ABJ 連動良好の下限',11,'%','これを超えれば連動良好。同時にCMJに伸びしろあり'),
 ('slcmj_target_ratio','SLCMJ 対CMJ 目標比',50,'%','両脚CMJの半分を目標値とする'),
 ('slcmj_tolerance','SLCMJ 目標値の許容幅',5,'%','目標値の±5%以内なら達成'),
 ('slcmj_red_ratio','SLCMJ 赤の下限（対目標値）',90,'%','目標値の90%未満で赤'),
 ('asym_flag','左右差フラグの閾値',10,'%','SLCMJ・SLSQ・片脚立位・地面タッチに適用'),
 ('rsi_diff_flag','ホップ／ドロップ RSI差フラグ',15,'%','両者の差がこれ以上でフラグ'),
 ('rsi_excellent','RSI 非常に良いの下限',3.1,'RSI','色は緑のまま、文章で「非常に良い」と出す'),
 ('age_band_border','ジュニア／大人の境界',17,'歳','17歳以上=大人、16歳以下=ジュニア'),
]

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
