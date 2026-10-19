const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'../content');
test('13模块与三路线满足v3前置和17/43/80课总数',()=>{
  const data=JSON.parse(fs.readFileSync(path.join(root,'curriculum.json'),'utf8'));
  assert.equal(data.modules.length,13);
  for(const [route,total] of [['R1',17],['R2',43],['R3',80]]) {
    assert.equal(data.routes[route].reduce((n,id)=>n+data.modules.find(m=>m.id===id).lessons.length,0),total);
    const seen=new Set();
    for(const id of data.routes[route]) {const module=data.modules.find(m=>m.id===id);assert.ok(module.prerequisites.every(p=>seen.has(p)));seen.add(id);}
  }
});
test('4准备、5拓展、5阶段验收均有操作证据和具体补练入口',()=>{
  const support=JSON.parse(fs.readFileSync(path.join(root,'support.json'),'utf8'));
  assert.equal(support.length,14);
  assert.equal(new Set(support.map(s=>s.id)).size,14);
  for(const [prefix,count] of [['P',4],['E',5],['G',5]]) assert.equal(support.filter(s=>s.id.startsWith(prefix)).length,count);
  const curriculum=JSON.parse(fs.readFileSync(path.join(root,'curriculum.json'),'utf8'));
  const lessons=new Set(curriculum.modules.flatMap(m=>m.lessons.map(l=>l.id)));
  for(const s of support) {
    assert.ok(s.title&&s.kind&&s.prerequisites&&s.lead?.length>=25,s.id);
    assert.ok(s.sections?.length>=2&&s.steps?.length>=3&&s.evidence?.length>=3,s.id);
    assert.ok(s.boundary?.length>=25&&s.help?.length>=2,s.id);
    assert.ok(s.related.length&&s.related.every(id=>lessons.has(id)),s.id);
  }
});
