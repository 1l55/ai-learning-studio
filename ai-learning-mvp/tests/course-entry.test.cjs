const test=require('node:test');
const assert=require('node:assert/strict');
const {resolveEntry}=require('../entry.js');
test('默认入口进入完整课程，旧四环节书签仍进入原上下文样课',()=>{
  assert.equal(resolveEntry('',''),'course.html');
  assert.equal(resolveEntry('','?route=R1'),'course.html?route=R1');
  for(const stage of ['guess','explain','experiment','practice'])assert.equal(resolveEntry('#'+stage,''),'context-lesson.html#'+stage);
  assert.equal(resolveEntry('#concept-memory',''),'context-lesson.html#concept-memory');
  assert.equal(resolveEntry('#resources',''),'course.html#resources');
  assert.equal(resolveEntry('#module-09',''),'course.html#module-09');
});
test('入口不接受外部重定向参数，恶意片段也只作为本地片段',()=>{
  assert.equal(resolveEntry('','?redirect=https://example.com'),'course.html');
  assert.equal(resolveEntry('','?route=evil'),'course.html');
  assert.ok(resolveEntry('#<script>','').startsWith('context-lesson.html#'));
});
