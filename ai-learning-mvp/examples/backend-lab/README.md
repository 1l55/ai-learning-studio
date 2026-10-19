# 本机后端与数据库练习 · 模块08—09

这是真正使用 HTTP 与 SQLite 的独立练习，区别于网站中的预制情境推演。已在 Windows、Node 24.19.0 验证；只用 Node 内置模块，无需 npm install。使用 `node:sqlite` 的运行版本必须实际支持该接口；以 `node --version` 与本目录运行结果为准。

把整个目录复制到自己的练习位置，再让 Codex 阅读副本。服务只监听本机127.0.0.1，数据库是目录里的tasks.sqlite。它没有登录、账户和多人隔离，用于模块08—09；完成模块10之前不能当作V3或公开应用。它不访问私人项目或外部数据库。

## 第一次启动

在本目录的终端运行：

```powershell
node --version
node server.cjs
```

保留这个终端。在浏览器打开 `http://127.0.0.1:8788/health`，应看到JSON的ok为true；访问 `/api/tasks` 起初是空数组。没有HTML页面是正常的，这个项目提供后端接口。若Node显示SQLite实验性提示，继续核对实际HTTP与数据结果，不把提示本身当作业务失败。

## 用第二个PowerShell窗口发一次真实请求

以下是相互独立的命令。请先核对地址属于自己刚启动的练习。

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:8788/api/tasks'

Invoke-RestMethod -Uri 'http://127.0.0.1:8788/api/tasks' -Method Post -ContentType 'application/json; charset=utf-8' -Body '{"title":"读一章书"}'
```

记录返回的实际id。下面示例用1，若你的返回不同，请替换为实际id：

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:8788/api/tasks/1' -Method Patch -ContentType 'application/json; charset=utf-8' -Body '{"done":true}'
```

再GET列表，核对标题保留、done变为true。尝试空标题或字符串`"true"`作为done，应该得到400与解释；这类非成功HTTP响应会在PowerShell中显示错误，需检查其中的响应，而非误以为命令从未发送。

| 入口 | 方法 | 输入与结果 |
| --- | --- | --- |
| /health | GET | 服务健康与范围说明 |
| /api/tasks | GET | 当前SQLite中的任务列表 |
| /api/tasks | POST | JSON只有title；成功201，默认done=false |
| /api/tasks/:id | GET | 读取一条；不存在404 |
| /api/tasks/:id | PATCH | title和/或布尔done；不允许修改id |
| /api/tasks/:id | DELETE | 成功204，不存在404 |

## 核对真正的保存

在服务终端按Ctrl+C停止，再运行 `node server.cjs`。重新GET，已有任务与状态应保留。复制源码到另一个位置却不带tasks.sqlite，会形成另一份数据；换路径后看到空列表不一定表示原库丢失。

## 看一次事务回滚

```powershell
node transactions.cjs
```

该脚本使用内存数据库，不改变服务的tasks.sqlite。先更新第一条再故意失败，事务回滚后两条都应保持起点；第二次允许共同成功，两条才一起修改。阅读store.cjs的BEGIN/COMMIT/ROLLBACK，对应实际打印结果。

## 备份与恢复小练习

先停止服务，再复制tasks.sqlite为备份。把服务源码和这份备份复制到另一个练习目录，将备份命名为tasks.sqlite，在副本启动服务并重新核对GET/修改。不要覆盖原目录中的唯一数据。这里使用默认日志方式，要求停止后复制；真实运行中的数据库备份与线上恢复应按所用数据库官方方法处理，不能把任意时间复制文件视为已经获得一致备份。

## 交给Codex的起始说明

> 请只读当前练习副本中的server.cjs、store.cjs与README。先不要修改。指出一个HTTP请求如何到达SQLite，说明输入检查、参数化查询、数据库约束与响应分别发生在哪里。再协助我实际完成一次创建、更新、无效请求、重启恢复与事务回滚检查，逐项记录实际结果；遇到工具或Node接口不可用时说明证据，不声称已经执行。

## 取材与适用范围

核对日期2026-10-16：[Node24 SQLite](https://nodejs.org/docs/latest-v24.x/api/sqlite.html)、[Node24 HTTP](https://nodejs.org/docs/latest-v24.x/api/http.html)、[SQLite事务](https://sqlite.org/lang_transaction.html)。这是教学用的单进程最小服务，不包含生产身份组件、迁移系统或线上运维配置；后续课程需要完成相应功能与真实验收。
