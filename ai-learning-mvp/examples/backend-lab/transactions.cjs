const {createStore}=require('./store.cjs');
const store=createStore(':memory:');
try{
  const a=store.create('读一章书');const b=store.create('整理桌面');
  console.log('起点：',store.list());
  try{store.renameBoth(a.id,b.id,'共同新标题',true);}catch(error){console.log('本次故意失败：',error.message);}
  console.log('回滚以后（两条应仍为原标题）：',store.list());
  store.renameBoth(a.id,b.id,'共同新标题',false);
  console.log('共同成功：',store.list());
}finally{store.close();}
