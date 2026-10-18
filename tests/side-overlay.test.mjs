import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSideFigure} from '../src/domain/quality-overlay.mjs';
test('side colors retain anatomical R/L without averaging and honor thresholds',()=>{
 const scores={'shoulder\|R':0,'shoulder\|L':80,'chest\|C':100};
 const right=renderSideFigure([], '/body/',{scores,theme:'flex',side:'R'});
 const left=renderSideFigure([], '/body/',{scores,theme:'strength',side:'L',rules:{flex_green_min:80}});
 assert.match(right,/data-region="shoulder\|R" data-value="0" data-color="#F04438"/);
 assert.doesNotMatch(right,/data-region="shoulder\|L"/);
 assert.match(left,/data-region="shoulder\|L" data-value="80" data-color="#12B76A"/);
 assert.match(left,/data-region="chest\|C"/);
 assert.doesNotMatch(renderSideFigure([], '/body/',{scores,theme:'balance'}),/data-region=/);
 assert.doesNotMatch(renderSideFigure([], '/body/',{theme:'strength'}),/data-region=/);
});
test('side sex fallback affects drawing only',()=>{
 assert.match(renderSideFigure([], '/body/',{sex:'F'}),/side.png/);
 for(const sex of ['M','X',''])assert.match(renderSideFigure([], '/body/',{sex}),/side-male.png/);
});

test('left side mirrors the figure while preserving anatomical scores and readable labels',()=>{const left=renderSideFigure([], '/body/',{theme:'flex',side:'L',scores:{'shoulder|L':33},prefix:'left'});assert.match(left,/立位・左側面/);assert.match(left,/translate\(240 0\) scale\(-1 1\)/);assert.match(left,/shoulder\|L/);assert.doesNotMatch(renderSideFigure([], '/body/',{side:'R'}),/translate\(240 0\)/);});
