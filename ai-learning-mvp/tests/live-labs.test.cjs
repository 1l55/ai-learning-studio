const test=require('node:test');
const assert=require('node:assert/strict');
const {attemptAdd}=require('../live-labs-core.js');
const initial=()=>[{id:'t01',title:'读一章书',done:false},{id:'t02',title:'整理桌面',done:true}];
test('真实空白检查会调用函数并提前返回，不增加记录',()=>{
  const before=initial();
  for(const value of ['','   ','\t\n']) {
    const result=attemptAdd(before,value);
    assert.equal(result.added,false);assert.deepEqual(result.tasks,before);
    assert.ok(result.trace.some(s=>s.step==='call'));assert.ok(result.trace.some(s=>s.step==='return'));
    assert.equal(result.trace.some(s=>s.step==='append'),false);
  }
});
test('非空标题去除两端空白，新增唯一身份并保留原记录',()=>{
  const before=initial();const result=attemptAdd(before,'  读 第二章  ');
  assert.equal(result.added,true);assert.deepEqual(result.tasks.slice(0,2),before);
  assert.deepEqual(result.tasks[2],{id:'t03',title:'读 第二章',done:false});
  assert.equal(before.length,2);assert.equal(result.trace.some(s=>s.step==='return'),false);
  assert.equal(new Set(attemptAdd(result.tasks,'再添加').tasks.map(t=>t.id)).size,4);
});
test('标题像HTML时仍作为文字保存，过长值不会写入',()=>{
  const text='<img src=x onerror=alert(1)>';
  assert.equal(attemptAdd(initial(),text).tasks[2].title,text);
  const result=attemptAdd(initial(),'字'.repeat(81));assert.equal(result.added,false);
  assert.equal(result.tasks.length,2);assert.match(result.message,/80/);
});
