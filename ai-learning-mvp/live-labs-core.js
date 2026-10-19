(function (root, factory) {
  const api=factory(); if(typeof module==='object'&&module.exports)module.exports=api;else root.CourseLabsCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function attemptAdd(source,rawTitle){
    const tasks=source.map(t=>({...t}));
    const trace=[{step:'call',detail:'点击处理调用 addTask，输入传入了函数。'}];
    const title=String(rawTitle).trim();
    trace.push({step:'trim',detail:`去除两端空白后的标题：${JSON.stringify(title)}`});
    trace.push({step:'check',detail:`title === "" 为 ${title===''}。`});
    if(title===''){
      trace.push({step:'hint',detail:'显示“请输入任务标题”。'},{step:'return',detail:'return 结束本次 addTask 调用；下面的追加没有执行。'});
      return{tasks,trace,added:false,message:'请输入任务标题'};
    }
    if(title.length>80){
      trace.push({step:'return',detail:'标题超过本实验80字上限，返回提示并保留原数据。'});
      return{tasks,trace,added:false,message:'本实验标题上限为80字'};
    }
    const next=Math.max(0,...tasks.map(t=>Number(t.id.replace(/^t/,''))).filter(Number.isFinite))+1;
    tasks.push({id:`t${String(next).padStart(2,'0')}`,title,done:false});
    trace.push({step:'append',detail:'空白条件不成立，追加一条具有新 ID 的记录。'},{step:'render',detail:'页面重新显示当前任务；这次没有保存到磁盘。'});
    return{tasks,trace,added:true,message:'已添加一条任务'};
  }
  return{attemptAdd};
});
