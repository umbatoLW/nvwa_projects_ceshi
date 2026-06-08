-- ============================================
-- 女娲短剧创作平台 - 数据库表结构
-- 迁移到新账号时，在新项目的扣子控制台执行此SQL
-- ============================================

-- 1. 剧本表
CREATE TABLE IF NOT EXISTS scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  genre TEXT,
  logline TEXT,
  main_characters JSONB DEFAULT '[]'::jsonb,
  villains JSONB DEFAULT '[]'::jsonb,
  episodes JSONB DEFAULT '[]'::jsonb,
  episode_count INTEGER DEFAULT 1,
  content TEXT,
  outline JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT scripts_user_id_check CHECK (user_id <> '')
);

-- 2. 角色表
CREATE TABLE IF NOT EXISTS characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  script_id UUID REFERENCES scripts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT,
  description TEXT,
  appearance TEXT,
  personality TEXT,
  backstory TEXT,
  avatar_url TEXT,
  reference_images JSONB DEFAULT '[]'::jsonb,
  expressions JSONB DEFAULT '{}'::jsonb,
  consistency_anchor JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 资产表（素材库）
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  script_id UUID REFERENCES scripts(id) ON DELETE SET NULL,
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- 'image', 'video', 'audio', 'document'
  name TEXT,
  description TEXT,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  file_size BIGINT,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  duration INTEGER, -- 秒数（音视频）
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 项目表
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  script_id UUID REFERENCES scripts(id) ON DELETE SET NULL,
  settings JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 工作流表
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  nodes JSONB DEFAULT '[]'::jsonb,
  edges JSONB DEFAULT '[]'::jsonb,
  variables JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 生成记录表
CREATE TABLE IF NOT EXISTS generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  script_id UUID REFERENCES scripts(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- 'script', 'outline', 'character', 'image', 'video'
  input JSONB NOT NULL,
  output JSONB,
  model TEXT,
  tokens_used INTEGER DEFAULT 0,
  credits_used DECIMAL(10,4) DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 7. 用户积分表
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  balance DECIMAL(10,4) DEFAULT 0,
  total_purchased DECIMAL(10,4) DEFAULT 0,
  total_used DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 积分交易表
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'purchase', 'usage', 'refund', 'bonus'
  amount DECIMAL(10,4) NOT NULL,
  balance_before DECIMAL(10,4),
  balance_after DECIMAL(10,4),
  description TEXT,
  reference_id UUID, -- 关联的 generation_id 或其他
  reference_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 模型定价表
CREATE TABLE IF NOT EXISTS model_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL UNIQUE,
  model_name TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'openai', 'anthropic', 'coze', etc.
  input_price DECIMAL(10,6) NOT NULL, -- 每千token价格
  output_price DECIMAL(10,6) NOT NULL,
  image_price DECIMAL(10,4), -- 每张图价格
  currency TEXT DEFAULT 'CNY',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. 用户设置表
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  preferences JSONB DEFAULT '{}'::jsonb,
  default_model TEXT,
  default_image_model TEXT,
  theme TEXT DEFAULT 'dark',
  language TEXT DEFAULT 'zh-CN',
  notifications JSONB DEFAULT '{"email": true, "browser": true}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. 管理员设置表
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. 平台API密钥表
CREATE TABLE IF NOT EXISTS platform_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL, -- 'openai', 'anthropic', 'coze', etc.
  name TEXT NOT NULL,
  api_key_encrypted TEXT NOT NULL,
  api_key_preview TEXT, -- 显示用（如 sk-xxx...xxx）
  is_active BOOLEAN DEFAULT TRUE,
  rate_limit INTEGER, -- 每分钟请求限制
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

-- 13. 聊天会话表
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  script_id UUID REFERENCES scripts(id) ON DELETE CASCADE,
  title TEXT,
  messages JSONB DEFAULT '[]'::jsonb,
  context JSONB DEFAULT '{}'::jsonb,
  model TEXT,
  total_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. 分析事件表
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 创建索引（提升查询性能）
-- ============================================

-- scripts 表索引
CREATE INDEX IF NOT EXISTS idx_scripts_user_id ON scripts(user_id);
CREATE INDEX IF NOT EXISTS idx_scripts_status ON scripts(status);
CREATE INDEX IF NOT EXISTS idx_scripts_created_at ON scripts(created_at DESC);

-- characters 表索引
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_script_id ON characters(script_id);

-- assets 表索引
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON assets(user_id);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_assets_script_id ON assets(script_id);

-- generations 表索引
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_type ON generations(type);
CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(status);

-- credit_transactions 表索引
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- analytics_events 表索引
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at DESC);

-- ============================================
-- 启用 Row Level Security (RLS)
-- ============================================

ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能访问自己的数据
CREATE POLICY "Users can manage own scripts" ON scripts
  FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "Users can manage own characters" ON characters
  FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "Users can manage own assets" ON assets
  FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "Users can manage own projects" ON projects
  FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "Users can manage own workflows" ON workflows
  FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "Users can manage own generations" ON generations
  FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "Users can manage own credits" ON user_credits
  FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "Users can manage own transactions" ON credit_transactions
  FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (user_id = auth.uid()::text);

CREATE POLICY "Users can manage own chat sessions" ON chat_sessions
  FOR ALL USING (user_id = auth.uid()::text);

-- ============================================
-- 初始化模型定价数据
-- ============================================

INSERT INTO model_pricing (model_id, model_name, provider, input_price, output_price, image_price) VALUES
  ('gpt-4o', 'GPT-4o', 'openai', 0.005, 0.015, NULL),
  ('gpt-4o-mini', 'GPT-4o Mini', 'openai', 0.00015, 0.0006, NULL),
  ('claude-3-5-sonnet', 'Claude 3.5 Sonnet', 'anthropic', 0.003, 0.015, NULL),
  ('doubao-seed-1.6', '豆包 Seed 1.6', 'coze', 0.001, 0.002, NULL),
  ('default-image', '默认图片生成', 'coze', 0, 0, 0.05)
ON CONFLICT (model_id) DO NOTHING;

-- ============================================
-- 完成
-- ============================================
-- 执行完成后，数据库结构已准备就绪
-- 下一步：上传代码文件
