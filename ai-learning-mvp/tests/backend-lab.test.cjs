const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createLab}=require('../examples/backend-lab/server.cjs');

test('真实HTTP创建读取更新与无效输入，SQLite在服务重启后恢复',async()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'ai-backend-lab-'));const db=path.join(folder,'tasks.sqlite');
  let lab=createLab({database:db});await new Promise(resolve=>lab.server.listen(0,'127.0.0.1',resolve));
  const base=()=>`http://127.0.0.1:${lab.server.address().port}`;
  const request=(url,method='GET',body)=>fetch(base()+url,{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  try{
    assert.equal((await request('/api/tasks')).status,200);
    const created=await request('/api/tasks','POST',{title:'读一章书'});assert.equal(created.status,201);const task=await created.json();
    assert.equal((await request('/api/tasks','POST',{title:'   '})).status,400);
    assert.equal((await request('/api/tasks','POST',{title:'字'.repeat(81)})).status,400);
    assert.equal((await request(`/api/tasks/${task.id}`,'PATCH',{done:'true'})).status,400);
    assert.equal((await request('/api/tasks/999999','PATCH',{done:true})).status,404);
    const updated=await request(`/api/tasks/${task.id}`,'PATCH',{done:true});assert.equal((await updated.json()).done,true);
    assert.equal((await request(`/api/tasks/${task.id}`,'PATCH',{id:77,title:'bad'})).status,400);
    assert.equal((await request('/api/tasks','POST',{title:'<img src=x>'})).status,201);
    await lab.close();lab=createLab({database:db});await new Promise(resolve=>lab.server.listen(0,'127.0.0.1',resolve));
    const restored=await (await request('/api/tasks')).json();assert.equal(restored.length,2);assert.equal(restored[0].done,true);
    assert.equal((await request(`/api/tasks/${task.id}`,'DELETE')).status,204);
    assert.equal((await (await request('/api/tasks')).json()).length,1);
  }finally{await lab.close();fs.rmSync(folder,{recursive:true,force:true});}
});
test('数据库约束、参数化查询与事务回滚可独立验证',async()=>{
  const lab=createLab({database:':memory:'});
  try{
    const a=lab.store.create("x'); DROP TABLE tasks; --");assert.ok(a.id);
    const b=lab.store.create('第二条');assert.equal(lab.store.list().length,2);
    assert.throws(()=>lab.store.db.prepare('INSERT INTO tasks(title,done) VALUES (?,?)').run('',0));
    assert.throws(()=>lab.store.renameBoth(a.id,b.id,'共同标题',true),/模拟中途失败/);
    assert.equal(lab.store.list()[0].title,"x'); DROP TABLE tasks; --");
    lab.store.renameBoth(a.id,b.id,'共同标题',false);assert.ok(lab.store.list().every(t=>t.title==='共同标题'));
  }finally{await lab.close();}
});
