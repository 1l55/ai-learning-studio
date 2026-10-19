(function(){
  'use strict';
  window.mountCourseLab=function(container,id){
    if(id!=='03.05')return;
    const {el}=window.CourseApp;
    let tasks=[{id:'t01',title:'读一章书',done:false},{id:'t02',title:'整理桌面',done:true}];
    const lab=el('section',null,{class:'live-lab','aria-labelledby':'live-lab-title'});
    lab.append(el('h3','真实按钮实验：空白标题走到了哪一步？',{id:'live-lab-title'}));
    lab.append(el('p','先输入三个空格，再输入一个标题。按钮会真实执行固定的添加逻辑，你可以同时核对数据和执行轨迹。'));
    const form=el('form');const label=el('label','待添加的标题',{for:'live-title'});
    const input=el('input',null,{id:'live-title',type:'text',maxlength:'80',autocomplete:'off'});input.value='   ';
    const value=el('p','',{class:'boundary-note'});
    const run=el('button','执行添加并看轨迹',{type:'submit',class:'button-primary'});
    const reset=el('button','恢复两条起始任务',{type:'button',class:'text-link'});
    const controls=el('div',null,{class:'live-controls'});controls.append(input,run,reset);form.append(label,controls,value);
    const result=el('div',null,{class:'live-result',role:'status'});result.hidden=true;
    const columns=el('div',null,{class:'live-columns'});const source=el('div');const preview=el('div');
    source.append(el('h3','实际数据'));const code=el('pre',null,{tabindex:'0'});source.append(code);
    preview.append(el('h3','执行轨迹'));const trace=el('ol',null,{class:'evidence-list'});preview.append(trace);columns.append(source,preview);
    function renderSource(){code.textContent=JSON.stringify(tasks,null,2);}
    function draft(){value.textContent=`输入中的实际字符：${JSON.stringify(input.value)}（引号帮助看见空格）。`;result.hidden=true;trace.replaceChildren();}
    input.addEventListener('input',draft);
    form.addEventListener('submit',event=>{
      event.preventDefault();const before=tasks.length;const attempt=window.CourseLabsCore.attemptAdd(tasks,input.value);tasks=attempt.tasks;
      result.textContent=`${attempt.message}。任务数量：${before} → ${tasks.length}。`;result.hidden=false;
      trace.replaceChildren(...attempt.trace.map(step=>el('li',step.detail)));renderSource();
    });
    reset.addEventListener('click',()=>{tasks=[{id:'t01',title:'读一章书',done:false},{id:'t02',title:'整理桌面',done:true}];input.value='   ';draft();renderSource();});
    lab.append(form,result,columns,el('p','本实验不执行输入的代码；数据仅在这次演示中存在。离开本环节或切换下方案例后，演示回到起点。',{class:'boundary-note'}));
    draft();renderSource();container.append(lab);
  };
})();
