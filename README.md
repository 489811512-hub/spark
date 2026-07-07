# SystemLock 认证管理后台 (Vercel + Vercel KV 部署版)

## 功能特性

- 仪表盘：设备总数、在线设备、锁定设备、今日新增统计
- 设备管理：设备列表、搜索筛选、远程锁定/解锁
- 密码生成：根据机器码生成解锁密码
- 数据持久化：使用 Vercel KV（免费 Redis 存储）

## 部署步骤（超简单！）

### 第一步：上传代码到 GitHub

1. 在 GitHub 上创建一个新仓库（New Repository）
2. 把 `vercel-deploy` 文件夹里的所有文件上传到这个仓库
3. 确保文件结构正确（根目录下有 package.json、api 目录、public 目录等）

### 第二步：导入到 Vercel

1. 打开 [vercel.com](https://vercel.com)，用 GitHub 账号登录
2. 点击 **Add New...** → **Project**
3. 选择你刚才创建的 GitHub 仓库
4. 点击 **Import**
5. 什么都不用改，直接点击 **Deploy**
6. 等待部署完成（大约 1-2 分钟）

### 第三步：开启 Vercel KV（数据库）

1. 部署完成后，进入项目后台
2. 点击顶部的 **Storage** 标签
3. 点击 **Create Database**
4. 选择 **KV**，点击 **Continue**
5. 填写：
   - **Name**: 随便起一个（比如 `systemlock`）
   - **Primary Region**: 选 `tokyo`（东京，离中国最近） 或 `singapore`（新加坡）
6. 点击 **Create**
7. 创建完成后，点击 **Connect** 按钮，连接到你的项目
8. 点击 **Connect Project** 确认

### 第四步：配置管理员密钥

1. 点击顶部 **Settings** 标签
2. 点击左侧 **Environment Variables**
3. 添加一个环境变量：
   - **Key**: `ADMIN_SECRET`
   - **Value**: `my-secret-key-2024`（自己设一个，别忘了！）
4. 点击 **Save**

### 第五步：重新部署

1. 点击顶部 **Deployments** 标签
2. 找到最新的部署，点击右边的三个点
3. 选择 **Redeploy**
4. 等待重新部署完成

### 第六步：完成！

部署完成后，访问你的 Vercel 网址，就能看到管理后台了！

## 锁屏客户端配置

部署完成后，修改 `Build.bat` 中的配置：

```bat
set "AUTH_SERVER_URL=https://你的项目.vercel.app/api/auth"
set "ADMIN_SECRET=你的管理员密钥"
```

**注意**：`ADMIN_SECRET` 必须和 Vercel 上配置的完全一致！

## API 接口

### 设备端接口

#### POST /api/auth
设备注册和状态查询

请求体：
```json
{
  "machine_id": "设备机器码",
  "action": "register"
}
```

action 可选值：`register` 或 `check_status`

### 管理端接口

- `GET /api/stats` - 获取统计数据
- `GET /api/devices` - 获取设备列表
- `POST /api/devices/:id/toggle-lock` - 切换锁定状态
- `POST /api/generate-password` - 生成解锁密码

## 项目结构

```
vercel-deploy/
├── package.json              # 依赖配置
├── public/                   # 前端静态文件
│   ├── index.html
│   ├── style.css
│   └── app.js
└── api/                      # Vercel Serverless Functions
    ├── _utils.js             # 工具函数
    ├── auth.js               # 设备认证接口
    ├── stats.js              # 统计数据接口
    ├── generate-password.js  # 密码生成接口
    └── devices/
        ├── index.js          # 设备列表接口
        └── [id]/
            └── toggle-lock.js  # 锁定/解锁接口
```
