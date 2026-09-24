# -*- coding: utf-8 -*-
"""
中務さん作成のイラスト（prototype/assets/人体図_原画.png）から、
prototype/style-sample.html に埋め込む人体図データ（FIGS）を作り直すスクリプト。

    python3 tools/人体図を取り込む.py > /tmp/figs.js

出力を style-sample.html の `var FIGS = {...};` と差し替える。
必要なもの： pip install pillow numpy

原画の前提
  - 3つのパネル（男性・女性・中性）が縦の罫線で区切られている
  - 各パネルに 前面・後面 の2体
  - 上下に色つきの見出し帯／脚注がある（y=100〜915 の範囲だけ使う）
原画を差し替えたときは PANEL_LINES と Y0/Y1 を測り直すこと。
"""
import sys, io, json, math, base64
from collections import deque
import numpy as np
from PIL import Image

SRC = 'prototype/assets/人体図_原画.png'
Y0, Y1 = 100, 915          # 見出し帯とフッタを除いた範囲
PANEL_LINES = (440, 871)   # パネルを区切る縦罫線の x
LINE_TH = 240              # これより暗ければ「線」
NAMES = ['male_front', 'male_back', 'female_front', 'female_back',
         'neutral_front', 'neutral_back']
sys.setrecursionlimit(300000)

G = np.asarray(Image.open(SRC).convert('RGB')).astype(int).mean(axis=2)[Y0:Y1]
H, W = G.shape

def dil(m, n=1):
    out = m.copy()
    for _ in range(n):
        o = out.copy()
        o[1:, :] |= out[:-1, :]; o[:-1, :] |= out[1:, :]
        o[:, 1:] |= out[:, :-1]; o[:, :-1] |= out[:, 1:]
        out = o
    return out

# --- 線の内側を塗る（外周から塗りつぶして、残りが体の中）
D = dil(G < LINE_TH, 1)                      # 1px の隙間をふさぐ
ext = np.zeros((H, W), bool); q = deque()
for x in range(W):
    for y in (0, H - 1):
        if not D[y, x] and not ext[y, x]: ext[y, x] = True; q.append((y, x))
for y in range(H):
    for x in (0, W - 1):
        if not D[y, x] and not ext[y, x]: ext[y, x] = True; q.append((y, x))
while q:
    y, x = q.popleft()
    for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
        ny, nx = y+dy, x+dx
        if 0 <= ny < H and 0 <= nx < W and not D[ny, nx] and not ext[ny, nx]:
            ext[ny, nx] = True; q.append((ny, nx))
INS = dil(~ext, 1)

# --- 6体に切り分ける（隣り合う図は手が触れているので、いちばん細いところで切る）
cut = INS.copy()
for c in PANEL_LINES: cut[:, c-8:c+9] = False
cs = INS.sum(axis=0)
for x0, x1 in [(2, PANEL_LINES[0]-2), (PANEL_LINES[0]+4, PANEL_LINES[1]-2), (PANEL_LINES[1]+4, W-3)]:
    a, b = x0 + int((x1-x0)*0.38), x0 + int((x1-x0)*0.62)
    cut[:, a + int(np.argmin(cs[a:b+1])) - 1 : a + int(np.argmin(cs[a:b+1])) + 2] = False

lab = np.zeros((H, W), np.int32); cur = 0; comps = []
for y0 in range(H):
    for x0 in range(W):
        if cut[y0, x0] and lab[y0, x0] == 0:
            cur += 1; q = deque([(y0, x0)]); lab[y0, x0] = cur; n = 0
            bx0 = bx1 = x0; by0 = by1 = y0
            while q:
                y, x = q.popleft(); n += 1
                bx0 = min(bx0, x); bx1 = max(bx1, x); by0 = min(by0, y); by1 = max(by1, y)
                for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
                    ny, nx = y+dy, x+dx
                    if 0 <= ny < H and 0 <= nx < W and cut[ny, nx] and lab[ny, nx] == 0:
                        lab[ny, nx] = cur; q.append((ny, nx))
            comps.append((n, cur, bx0, bx1, by0, by1))
comps = sorted([c for c in comps if c[0] > 20000], key=lambda c: c[2])
assert len(comps) == 6, '6体に分かれませんでした: %s' % [c[0] for c in comps]

# --- 共通の座標系（viewBox 0 0 240 448／頭のてっぺん〜足裏を 14〜431 に収める）
SC = 417.0 / max(c[5]-c[4]+1 for c in comps)
N8 = [(-1,0),(-1,1),(0,1),(1,1),(1,0),(1,-1),(0,-1),(-1,-1)]

def trace(m):
    ys, xs = np.nonzero(m); sy = int(ys.min()); sx = int(xs[ys == sy].min())
    C = [(sy, sx)]; cy, cx, bd = sy, sx, 6
    while True:
        for k in range(8):
            d = (bd+1+k) % 8; ny, nx = cy+N8[d][0], cx+N8[d][1]
            if 0 <= ny < m.shape[0] and 0 <= nx < m.shape[1] and m[ny, nx]:
                bd = (d+5) % 8; cy, cx = ny, nx; C.append((cy, cx)); break
        else: break
        if (cy, cx) == (sy, sx) and len(C) > 10: break
    return [(float(x), float(y)) for y, x in C]

def dp(p, eps):                              # Douglas-Peucker で点を間引く
    if len(p) < 3: return p
    x0, y0 = p[0]; x1, y1 = p[-1]; dx, dy = x1-x0, y1-y0; L = math.hypot(dx, dy)
    dmax = 0; idx = 0
    for i in range(1, len(p)-1):
        x, y = p[i]
        d = abs(dy*x - dx*y + x1*y0 - y1*x0)/L if L > 0 else math.hypot(x-x0, y-y0)
        if d > dmax: dmax = d; idx = i
    if dmax > eps: return dp(p[:idx+1], eps)[:-1] + dp(p[idx:], eps)
    return [p[0], p[-1]]

rows = []
for c, nm in zip(comps, NAMES):
    n, cid, x0, x1, y0, y1 = c
    m = (lab == cid); cxs = (x0+x1)/2.0
    fh = (y1-y0+1)*SC; top = 431 - fh
    TY = lambda y: top + (y-y0)*SC

    def runs(y):
        out = []; s = None
        for x in range(x0-6, x1+7):
            v = m[y, x]
            if v and s is None: s = x
            if not v and s is not None:
                if x-s > 2: out.append((s, x-1))
                s = None
        if s is not None: out.append((s, x1+6))
        return out

    # 体の正中線（絵の中心とは少しずれる）
    rr0 = runs(y0 + int((y1-y0)*0.35))
    cen0 = min(rr0, key=lambda r: abs((r[0]+r[1])/2 - cxs))
    axis = int(round((cen0[0]+cen0[1])/2))
    TX = lambda x: (x-axis)*SC

    crotch = next(y for y in range(y0+int((y1-y0)*0.40), y0+int((y1-y0)*0.80)) if not m[y, axis])
    def cenrun(y):
        for r in runs(y):
            if r[0] <= axis <= r[1]: return r
        return None
    widths = {y: cenrun(y)[1]-cenrun(y)[0]+1 for y in range(y0+8, crotch) if cenrun(y)}
    up = [y for y in widths if y0+(crotch-y0)*0.28 < y < y0+(crotch-y0)*0.46]
    shY = max(up, key=lambda y: widths[y]); shHalf = widths[shY]/2.0

    def legrun(y):
        rr = [r for r in runs(y) if r[1]-r[0] > 8 and (r[0]+r[1])/2 > axis]
        return rr[0] if rr else None
    lw = {y: legrun(y) for y in range(crotch+5, y1-5) if legrun(y)}
    kneeY = min([y for y in lw if crotch+(y1-crotch)*0.22 < y < crotch+(y1-crotch)*0.55],
                key=lambda y: lw[y][1]-lw[y][0])
    calfY = max([y for y in lw if kneeY < y < crotch+(y1-crotch)*0.76],
                key=lambda y: lw[y][1]-lw[y][0])
    thighY = int(crotch + (kneeY-crotch)*0.42)
    leg = lambda y: [round(TX((lw[y][0]+lw[y][1])/2), 1), round(TY(y), 1),
                     round((lw[y][1]-lw[y][0]+1)*SC/2, 1)]

    armY = int(shY + (crotch-shY)*0.40)
    armOuter = round(TX(max(r[1] for r in runs(armY) if r[1] > axis)), 1)
    wY = int(shY + (crotch-shY)*0.52); wr = cenrun(wY)
    waistHalf = round((wr[1]-wr[0]+1)*SC/2, 1)

    # 輪郭（色のにじみを切り抜くための path）
    simp = dp(trace(m), 1.0)
    d = 'M' + ' L'.join('%.1f,%.1f' % (120 + (x-cxs)*SC, top + (y-y0)*SC) for x, y in simp) + ' Z'

    # 線画（白＝線 の濃淡画像。SVGのマスクとして重ねる）
    reg = dil(m, 4); pad = 4
    bx0, bx1 = max(0, x0-pad), min(W-1, x1+pad)
    by0, by1 = max(0, y0-pad), min(H-1, y1+pad)
    al = np.clip(255 - G[by0:by1+1, bx0:bx1+1], 0, 255)
    al[~reg[by0:by1+1, bx0:bx1+1]] = 0
    al[al < 16] = 0                                   # 背景のごくうすい濃淡を捨てる
    al = (np.round(al/255*15)/15*255).astype(np.uint8)  # 16階調にして軽くする
    buf = io.BytesIO(); Image.fromarray(al, 'L').save(buf, 'PNG', optimize=True)
    img = base64.b64encode(buf.getvalue()).decode()

    rows.append(
      "  %s:{d:'%s',\n    axisOff:%s,x:%s,y:%s,w:%s,h:%s,shY:%s,shHalf:%s,crotchY:%s,footY:%s,"
      "armY:%s,armOuter:%s,waistHalf:%s,\n    thigh:%s,knee:%s,calf:%s,\n    img:'%s'}" % (
        nm, d, round((axis-cxs)*SC, 1),
        round(120+(bx0-cxs)*SC, 1), round(top+(by0-y0)*SC, 1),
        round((bx1-bx0+1)*SC, 1), round((by1-by0+1)*SC, 1),
        round(TY(shY), 1), round(shHalf*SC, 1), round(TY(crotch), 1), round(TY(y1), 1),
        round(TY(armY), 1), armOuter, waistHalf,
        json.dumps(leg(thighY)), json.dumps(leg(kneeY)), json.dumps(leg(calfY)), img))
    sys.stderr.write('%-14s 輪郭%3d点  線画%6dB\n' % (nm, len(simp), len(img)))

print('var FIGS = {\n' + ',\n'.join(rows) + '\n};')
