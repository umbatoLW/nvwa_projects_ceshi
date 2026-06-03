# AI创作工作台 - 阿里云迁移完整指南

> 文档版本：v1.0  
> 更新日期：2026-05-22

---

## 一、当前系统架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    当前架构（Coze 沙箱）                      │
├─────────────────────────────────────────────────────────────┤
│  前端（Next.js） + 后端（API Routes）                        │
│           ↓                                                  │
│  Supabase（PostgreSQL + Auth）                              │
│           ↓                                                  │
│  对象存储（Coze 内置 OSS）                                   │
│           ↓                                                  │
│  阿里云百炼 API（AI 生成服务）                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、后端数据清单

### 2.1 数据库表详情

| 表名 | 用途 | 字段数 | 关键数据 |
|------|------|--------|---------|
| `assets` | 用户生成资产（图片/视频/3D） | 14 | URL、提示词、模型 |
| `characters` | 角色库数据 | 13 | 角色设定、三视图 |
| `generations` | 生成记录 | 8 | 生成类型、参数 |
| `projects` | 项目数据 | 6 | 项目状态 |
| `scripts` | 剧本数据 | 19 | 剧本内容、分镜 |
| `user_settings` | 用户设置（含API Key） | 7 | 用户API Key |
| `workflows` | 工作流数据 | 8 | 节点、连线 |

### 2.2 数据库表结构详情

#### assets 表（用户资产）
| 字段名 | 数据类型 | 说明 |
|--------|---------|------|
| id | VARCHAR(36) | 主键，UUID |
| name | VARCHAR | 资产名称 |
| type | VARCHAR | 类型：image/video/3d |
| url | TEXT | 资产URL |
| tags | JSONB | 标签数组 |
| user_id | VARCHAR(36) | 用户ID |
| category | VARCHAR(50) | 分类：image/video/3d/edit |
| prompt | TEXT | 生成提示词 |
| model | VARCHAR(100) | 使用模型 |
| metadata | JSONB | 元数据 |
| created_at | TIMESTAMP | 创建时间 |

#### user_settings 表（用户设置）
| 字段名 | 数据类型 | 说明 |
|--------|---------|------|
| id | VARCHAR(36) | 主键 |
| user_id | VARCHAR(36) | 用户ID（唯一） |
| dashscope_api_key | TEXT | 阿里云百炼API Key |
| openai_api_key | TEXT | OpenAI API Key |
| settings | JSONB | 完整设置JSON |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

#### scripts 表（剧本数据）
| 字段名 | 数据类型 | 说明 |
|--------|---------|------|
| id | VARCHAR(36) | 主键 |
| title | VARCHAR | 剧本标题 |
| genre | VARCHAR | 类型 |
| synopsis | TEXT | 简介 |
| content | TEXT | 正文内容 |
| storyboards | JSONB | 分镜数据 |
| roles | JSONB | 角色数据 |
| user_id | VARCHAR(36) | 用户ID |

### 2.3 RLS（行级安全）策略

| 表名 | 策略名 | 操作 | 条件 |
|------|--------|------|------|
| user_settings | Users can view own settings | SELECT | auth.uid() = user_id |
| user_settings | Users can insert own settings | INSERT | 无条件 |
| user_settings | Users can update own settings | UPDATE | auth.uid() = user_id |

### 2.4 环境变量清单

| 变量名 | 用途 | 示例值 | 必需 |
|--------|------|--------|------|
| `COZE_SUPABASE_URL` | Supabase 数据库地址 | `https://xxx.supabase.co` | ✅ |
| `COZE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | `eyJxxx...` | ✅ |
| `COZE_SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务角色密钥 | `eyJxxx...` | ✅ |
| `DASHSCOPE_API_KEY` | 阿里云百炼 API Key | `sk-xxx` | ✅ |
| `COZE_BUCKET_ENDPOINT_URL` | 对象存储端点 | `https://oss-cn-hangzhou.aliyuncs.com` | ✅ |
| `COZE_BUCKET_NAME` | 对象存储桶名 | `my-bucket` | ✅ |

### 2.5 第三方服务依赖

| 服务 | 用途 | 当前提供商 | 迁移建议 |
|------|------|-----------|---------|
| 用户认证 | 登录/注册 | Supabase Auth | 保持或自建 |
| 数据库 | 数据存储 | Supabase PostgreSQL | 迁移到阿里云RDS |
| 对象存储 | 文件存储 | Coze 内置 OSS | 迁移到阿里云OSS |
| AI服务 | 文生图/视频/3D | 阿里云百炼 | 保持不变 |

---

## 三、迁移方案

### 方案A：全量迁移到阿里云（推荐）

```
┌─────────────────────────────────────────────────────────────┐
│                    阿里云架构                                │
├─────────────────────────────────────────────────────────────┤
│  用户 → CDN → SLB → ECS (Next.js) → RDS PostgreSQL         │
│                    ↓                                        │
│               OSS (对象存储)                                 │
│                    ↓                                        │
│            阿里云百炼 API                                    │
└─────────────────────────────────────────────────────────────┘
```

### 方案B：混合部署（数据库不迁移）

```
┌─────────────────────────────────────────────────────────────┐
│                    混合架构                                  │
├─────────────────────────────────────────────────────────────┤
│  用户 → CDN → 阿里云ECS → Supabase（数据库+认证）            │
│                    ↓                                        │
│            阿里云 OSS                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 四、迁移步骤清单

### 第一阶段：准备工作（预计1-2天）

#### 1.1 购买阿里云资源

| 序号 | 资源 | 推荐配置 | 月费用参考 | 购买链接 |
|------|------|---------|-----------|---------|
| 1 | ECS服务器 | 2核4G / CentOS 7.9 | ¥100-200 | 阿里云控制台 |
| 2 | RDS PostgreSQL | 基础版 1核2G | ¥100-200 | 阿里云控制台 |
| 3 | OSS对象存储 | 标准存储 | 按量付费 | 阿里云控制台 |
| 4 | 域名 | .com | ¥60/年 | 阿里云万网 |
| 5 | SSL证书 | 免费DV证书 | ¥0 | 阿里云控制台 |

#### 1.2 数据备份

```bash
# 1. 导出数据库
pg_dump -h <supabase-host> -U postgres -d postgres > db_backup_$(date +%Y%m%d).sql

# 2. 导出环境变量清单
# 手动记录所有环境变量值

# 3. 备份代码仓库
git clone <repo-url> code_backup
```

#### 1.3 域名备案

| 步骤 | 内容 | 所需材料 | 时间 |
|------|------|---------|------|
| 1 | 提交备案申请 | 营业执照/身份证 | 1天 |
| 2 | 阿里云初审 | - | 1-2天 |
| 3 | 管局审核 | - | 5-15天 |
| 4 | 备案完成 | - | - |

---

### 第二阶段：数据库迁移（预计1天）

#### 2.1 创建目标数据库

```sql
-- 在阿里云RDS中执行
CREATE DATABASE ai_creation;
CREATE USER app_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE ai_creation TO app_user;
```

#### 2.2 迁移数据

```bash
# 方法1：使用 pg_dump 和 psql
pg_dump -h <supabase-host> -U postgres -d postgres > backup.sql
psql -h <aliyun-rds-host> -U app_user -d ai_creation < backup.sql

# 方法2：使用数据传输服务 DTS（阿里云控制台）
# 在控制台配置数据迁移任务
```

#### 2.3 重建RLS策略

```sql
-- 在新数据库执行
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid()::text = user_id);
```

---

### 第三阶段：应用部署（预计1天）

#### 3.1 服务器环境配置

```bash
# 安装 Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# 安装 pnpm
npm install -g pnpm

# 安装 PM2（进程管理）
npm install -g pm2

# 安装 Nginx
yum install -y nginx
```

#### 3.2 部署应用代码

```bash
# 创建应用目录
mkdir -p /var/www/ai-creation
cd /var/www/ai-creation

# 克隆代码
git clone <your-repo> .

# 安装依赖
pnpm install

# 创建环境变量文件
cat > .env << EOF
COZE_SUPABASE_URL=https://your-rds-endport
COZE_SUPABASE_ANON_KEY=your-anon-key
COZE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DASHSCOPE_API_KEY=your-dashscope-key
COZE_BUCKET_ENDPOINT_URL=https://oss-cn-hangzhou.aliyuncs.com
COZE_BUCKET_NAME=your-bucket-name
EOF

# 构建应用
pnpm build

# 启动应用
pm2 start pnpm --name "ai-creation" -- start
pm2 save
pm2 startup
```

#### 3.3 Nginx 配置

```nginx
# /etc/nginx/conf.d/ai-creation.conf
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

### 第四阶段：对象存储迁移（预计1天）

#### 4.1 创建 OSS Bucket

```bash
# 在阿里云OSS控制台：
# 1. 创建 Bucket（选择与 ECS 同区域）
# 2. 设置为私有读写
# 3. 配置 CORS 规则
```

#### 4.2 CORS 配置

```json
[
  {
    "allowedOrigin": ["*"],
    "allowedMethod": ["GET", "PUT", "POST", "DELETE"],
    "allowedHeader": ["*"],
    "exposeHeader": [],
    "maxAgeSeconds": 3600
  }
]
```

#### 4.3 迁移文件

```bash
# 使用 ossutil 工具
ossutil cp oss://old-bucket oss://new-bucket -r
```

---

### 第五阶段：域名与HTTPS（预计1天）

#### 5.1 配置DNS解析

```
类型: A
主机记录: @
记录值: ECS公网IP

类型: A
主机记录: www
记录值: ECS公网IP
```

#### 5.2 配置HTTPS

```bash
# 1. 申请免费SSL证书（阿里云控制台）
# 2. 下载证书文件
# 3. 配置 Nginx

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/your-domain.com.pem;
    ssl_certificate_key /etc/nginx/ssl/your-domain.com.key;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
    }
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 五、验证检查清单

### 5.1 功能验证

| 序号 | 检查项 | 状态 |
|------|--------|------|
| 1 | 首页正常访问 | ☐ |
| 2 | 用户登录/注册 | ☐ |
| 3 | 用户设置保存 | ☐ |
| 4 | API Key 保存和读取 | ☐ |
| 5 | 文生图功能 | ☐ |
| 6 | 文生视频功能 | ☐ |
| 7 | 3D生成功能 | ☐ |
| 8 | 图像编辑功能 | ☐ |
| 9 | 历史记录显示 | ☐ |
| 10 | 文件上传/下载 | ☐ |

### 5.2 安全验证

| 序号 | 检查项 | 状态 |
|------|--------|------|
| 1 | HTTPS 正常 | ☐ |
| 2 | 环境变量未暴露 | ☐ |
| 3 | API Key 加密存储 | ☐ |
| 4 | RLS 策略生效 | ☐ |
| 5 | CORS 配置正确 | ☐ |

### 5.3 性能验证

| 序号 | 检查项 | 状态 |
|------|--------|------|
| 1 | 首页加载 < 3秒 | ☐ |
| 2 | API 响应 < 5秒 | ☐ |
| 3 | 图片加载正常 | ☐ |

---

## 六、注意事项

### 6.1 数据安全

| 风险项 | 解决方案 |
|--------|---------|
| 用户API Key泄露 | 数据库字段加密存储 |
| 数据库泄露 | 使用强密码 + 限制访问IP |
| 文件泄露 | OSS使用签名URL |

### 6.2 成本优化

| 优化项 | 方法 |
|--------|------|
| CDN加速 | 静态资源走CDN |
| 图片压缩 | 使用WebP格式 |
| 自动伸缩 | 配置弹性伸缩规则 |

### 6.3 运维建议

| 项目 | 建议 |
|------|------|
| 监控 | 配置云监控告警 |
| 备份 | 每日自动备份 |
| 日志 | 开启访问日志 |
| 安全 | 定期更新依赖 |

---

## 七、回滚方案

如果迁移失败，按以下步骤回滚：

```bash
# 1. DNS 切回原地址
# 2. 数据库切回 Supabase
# 3. 恢复环境变量
# 4. 重启服务
```

---

## 八、联系方式

如有问题，请联系技术支持。

---

**文档结束**
