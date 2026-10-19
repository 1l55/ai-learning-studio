# AI 学习 · 从理解 AI 到独立创作

面向零基础普通人的完整课程第一版。默认入口 index.html 进入[课程总览](course.html)，已提供13模块、80节主课，以及4项入门准备、5个拓展和5次阶段验收。无需账号、模型密钥或运行依赖；学习网站本身不调用模型。

## 怎样开始

推荐通过本地HTTP服务打开 course.html。本次预览为 http://127.0.0.1:8766/ 。页面右上角“我的练习”可查看记录；手机端先打开目录，再进入学习记录。

三条路线为通用AI（01→04→05，17课）、本地创作（01—07，43课）、联网应用（01—13，80课）。前置与编号来自[课程总纲v3](../docs/curriculum/2026-10-15-ai-creation-curriculum-v3.md)。文件操作尚不熟悉时，可从总览底部的入门准备P01开始。

每节主课有情境预测、四节机制解释、术语、两个条件变化案例、独立操作步骤、可复制的Codex说明、证据清单、故障帮助和两道迁移题。共160个教学案例、400道带逐选项理由的判断题。正文与案例是已写出的教材。

## 实验与外部实操

- 主课中的160个案例明确标为**预制情境推演**，用于练习原因与结果，不是实时模型输出或真实部署结果。
- 03.04链接[数据增强实验](data-literacy.html#experiment)，可按ID改标题、改状态、新增、调序并观察实际差异。
- 05.02链接[上下文增强实验](context-lesson.html#experiment)，可改变背景条件。原 index.html#experiment 等样课书签仍会转到对应旧页面。
- 03.05有真正执行固定添加逻辑的按钮实验：空白标题提前返回，有效标题追加记录，数据与执行轨迹可核对。
- 模块08—09提供[HTTP + SQLite独立练习包](examples/08-09-backend-lab.zip)，解压后按[说明](examples/backend-lab/README.md)运行。已在Windows、Node24.19.0验证；只有本机接口与数据库，无账号隔离，也不作为公开部署应用。
- 其他课提供实际操作步骤与验收要求；网站不会替学习者创建账户、运行模型、操作外部数据库或发布作品。阶段验收需要自己的真实证据。

课内完成要求：记录阅读，预测、两个案例、两道迁移题全部通过后手动记录完成。外部实操是独立的“自行验收”，没有勾选也能记录课内完成；勾选不等于系统认证。改变已提交答案会撤销该题通过及本课完成。

## 本地记录与原样课

新课程使用 ai-learning:course:v1 保存进度与每课最多8000字的证据笔记，可逐课导出Markdown。两节增强样课分别保留 ai-learning:context-lesson:v1、ai-learning:data-literacy:v1，重置新课程不修改旧键。实验任务数据刷新回到起点。

记录只属于当前浏览器与当前来源。不同端口、file地址与HTTP来源可能不共享记录，清理浏览器数据会丢失记录。存储不可用时页面会提示，仍可学习。跨课保存只合并当前课，避免旧标签覆盖其他课笔记。

## 实操配图范围

上下文增强样课保留官方Codex演示的原始画面，来源见[assets/SOURCES.md](assets/SOURCES.md)。它不是本机任务项目的逐步操作截图。

**各课对应的Codex原生操作截图尚未补齐**：当前原生应用接口不可用，页面已明确标记。没有使用生成图、网站截图或其他演示冒充真实内部操作。网站实际截图只用于页面验收。制作清单见[production-status.md](../docs/curriculum/production-status.md)。

## 内容维护与验证

正文在 content/modules/01.json—13.json；总纲元数据在 content/curriculum.json，支持活动在 content/support.json。修改后从工作区根目录执行：

~~~powershell
node scripts/build-course.cjs
node --test ai-learning-mvp/tests/*.test.cjs docs/curriculum/lessons/tests/*.test.cjs
~~~

content/course-data.js 是生成的静态包，使页面无需fetch或构建服务。测试核对80课与总纲、内容结构、逐选项反馈、路线、进度规则、生成包一致性、本地资源及独立练习。字符长度与结构检查只是校验，不能单独证明课程教学效果。

真实浏览器另验收桌面1536×1024、手机390×844的路线、阅读、预测、结果、自检、复制、刷新、返回、重置和实验。详细证据与边界见[VALIDATION.md](VALIDATION.md)。本轮没有对file协议、禁用存储或所有外部服务做端到端验证。

总览按用户确认的[黑金原型](../docs/design/full-course-overview-v1.png)实现；课程与增强实验沿用已确认样课。对照记录见[视觉验收](../docs/design/2026-10-16-full-course-fidelity.md)。
