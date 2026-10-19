const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../course-core.js');
const question = { question:'一个具体问题', options:[
  {text:'先看对应证据',correct:true,feedback:'证据可以确认当前状态'},
  {text:'根据印象判断',correct:false,feedback:'印象不能说明当前状态'},
  {text:'立即扩大修改',correct:false,feedback:'扩大修改可能引入新问题'}
]};
const lesson = id => ({id, title:id, predict:question,checks:[question,question],experiment:{cases:[question,question]}});
const data = {lessons:['01.01','02.01','04.01','05.01'].map(lesson),routes:{R1:['01','04','05'],R2:['01','02','03','04','05','06','07'],R3:Array.from({length:13},(_,i)=>String(i+1).padStart(2,'0'))}};

test('通用AI路线按01→04→05，前后课不会误入编程前置', () => {
  assert.deepEqual(core.getRoute(data,'R1').map(l=>l.id), ['01.01','04.01','05.01']);
  assert.deepEqual(core.neighbors(data,'04.01','R1'), {previous:'01.01',next:'05.01'});
  assert.equal(core.getLesson(data,'<script>'),null);
});
test('选项反馈来自实际所选答案，空答与越界答不通过', () => {
  assert.deepEqual(core.grade(question,1), {correct:false,feedback:question.options[1].feedback});
  for (const index of [undefined,null,'0',-1,3]) assert.equal(core.grade(question,index).correct,false);
  assert.equal(core.grade(question,0).correct,true);
});
test('损坏、旧版与伪造完成记录不能解锁完成状态', () => {
  for (const raw of ['{','[]','null','{"version":4}']) assert.equal(core.readProgress(raw,data).version,1);
  const p=core.readProgress(JSON.stringify({version:1,route:'R1',lessons:{'01.01':{completed:true,read:true,answers:{predict:0}},evil:{completed:true}}}),data);
  assert.equal(p.lessons['01.01'].completed,false);
  assert.equal(p.lessons.evil,undefined);
  assert.equal(core.summarize(data,p,'R1').completed,0);
});
test('阅读、预测、两案例和迁移题全部有效后可完成，外部实操独立记录', () => {
  const l=data.lessons[0];
  const record={read:true,answers:{predict:0,'case-0':0,'case-1':0,'check-0':0,'check-1':0},practiced:false,completed:true};
  assert.equal(core.canComplete(l,record),true);
  const p=core.readProgress(JSON.stringify({version:1,lessons:{'01.01':record}}),data);
  assert.equal(p.lessons['01.01'].completed,true);
  assert.equal(p.lessons['01.01'].practiced,false);
  assert.equal(core.summarize(data,p,'R1').completed,1);
  assert.equal(core.canComplete(l,{...record,read:false}),false);
  assert.equal(core.canComplete(l,{...record,answers:{...record.answers,'case-1':1}}),false);
});
test('恢复时撤销错题完成状态、限制笔记并保留有效自行验收', () => {
  const raw={version:1,lastLesson:'unknown',route:'bad',lessons:{'01.01':{read:true,practiced:true,completed:true,answers:{predict:1,'case-0':99},notes:'a'.repeat(12000)}}};
  const p=core.readProgress(JSON.stringify(raw),data);
  assert.equal(p.route,'R3'); assert.equal(p.lastLesson,'01.01');
  assert.equal(p.lessons['01.01'].completed,false);
  assert.equal(p.lessons['01.01'].practiced,true);
  assert.equal(p.lessons['01.01'].notes.length,8000);
  assert.equal(p.lessons['01.01'].answers['case-0'],undefined);
});
test('合法JSON中的异常route类型不会阻止课程初始化',()=>{
  for(const route of [{toString:null},[],4,null,'constructor']){
    const progress=core.readProgress(JSON.stringify({version:1,route}),data);
    assert.equal(progress.route,'R3');
    assert.equal(core.getRoute(data,progress.route).length,4);
  }
  assert.equal(core.getRoute(data,'constructor').length,4);
});
test('旧标签保存本课时，不覆盖另一课更新的进度与笔记',()=>{
  const old=core.readProgress(null,data);old.lessons['01.01']={...core.emptyRecord(),notes:'课A新笔记'};old.lastLesson='01.01';
  const latest=core.readProgress(null,data);latest.lessons['02.01']={...core.emptyRecord(),read:true,notes:'课B已经保存'};
  const merged=core.mergeProgress(JSON.stringify(latest),old,{lessonId:'01.01'},data);
  assert.equal(merged.lessons['02.01'].notes,'课B已经保存');
  assert.equal(merged.lessons['01.01'].notes,'课A新笔记');
  assert.equal(merged.lastLesson,'01.01');
  const changedRoute=core.mergeProgress(JSON.stringify(merged),{...old,route:'R1'},{route:true},data);
  assert.equal(changedRoute.route,'R1');assert.ok(changedRoute.lessons['02.01']);
});

test('支持页局部保存保留其他记录，重置后重新读取不恢复旧勾选',()=>{
  const supported={...data,support:[{id:'P01',evidence:['位置','副本']}]};
  const latest=core.readProgress(null,supported);latest.lessons['02.01']={...core.emptyRecord(),notes:'另一课'};
  const current=core.readProgress(null,supported);current.support.P01={checked:[0],notes:''};
  const merged=core.mergeProgress(JSON.stringify(latest),current,{supportId:'P01'},supported);
  assert.equal(merged.lessons['02.01'].notes,'另一课');assert.deepEqual(merged.support.P01.checked,[0]);
  const reset=core.mergeProgress(JSON.stringify(merged),core.readProgress(null,supported),{reset:true},supported);
  assert.deepEqual(core.readProgress(JSON.stringify(reset),supported).support,{});
});
