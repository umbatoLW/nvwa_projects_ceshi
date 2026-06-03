-- ============================================
-- 剧本创作平台数据库表结构
-- 在 Supabase SQL Editor 中执行此脚本
-- ============================================

-- 1. 健康检查表
CREATE TABLE IF NOT EXISTS health_check (
  id SERIAL PRIMARY KEY,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 角色表
CREATE TABLE IF NOT EXISTS characters (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(128) NOT NULL,
  avatar TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  personality TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]',
  views JSONB NOT NULL DEFAULT '[]',
  expressions JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id VARCHAR(36),
  forbidden_features TEXT DEFAULT '',
  consistency_anchor TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS characters_created_at_idx ON characters(created_at);
CREATE INDEX IF NOT EXISTS characters_status_idx ON characters(status);

-- 3. 生成记录表
CREATE TABLE IF NOT EXISTS generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL,
  prompt TEXT,
  model VARCHAR(100),
  params JSONB,
  results JSONB,
  user_id VARCHAR(36),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 工作流表
CREATE TABLE IF NOT EXISTS workflows (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  status VARCHAR(50) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id VARCHAR(36)
);
CREATE INDEX IF NOT EXISTS workflows_created_at_idx ON workflows(created_at);
CREATE INDEX IF NOT EXISTS workflows_status_idx ON workflows(status);

-- 5. 资产表
CREATE TABLE IF NOT EXISTS assets (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'image',
  url TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id VARCHAR(36),
  uses INTEGER NOT NULL DEFAULT 0,
  category VARCHAR(50) DEFAULT 'media',
  script_id VARCHAR(36),
  character_id VARCHAR(36),
  prompt TEXT,
  model VARCHAR(100),
  metadata JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS assets_category_idx ON assets(category);
CREATE INDEX IF NOT EXISTS assets_created_at_idx ON assets(created_at);
CREATE INDEX IF NOT EXISTS assets_type_idx ON assets(type);
CREATE INDEX IF NOT EXISTS assets_user_id_idx ON assets(user_id);

-- 6. 剧本表
CREATE TABLE IF NOT EXISTS scripts (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  genre VARCHAR(100) NOT NULL DEFAULT '',
  synopsis TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  scenes INTEGER NOT NULL DEFAULT 0,
  characters INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id VARCHAR(36),
  storyboards JSONB DEFAULT '[]',
  roles JSONB DEFAULT '[]',
  costumes JSONB DEFAULT '{}',
  extracted_scenes JSONB DEFAULT '{}',
  props JSONB DEFAULT '{}',
  episode_count INTEGER DEFAULT 0,
  cover_image TEXT NOT NULL DEFAULT '',
  word_count INTEGER DEFAULT 0,
  scene_count INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS scripts_created_at_idx ON scripts(created_at);
CREATE INDEX IF NOT EXISTS scripts_status_idx ON scripts(status);

-- 7. 项目表
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL DEFAULT '',
  status VARCHAR(50) NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id VARCHAR(36)
);
CREATE INDEX IF NOT EXISTS projects_status_idx ON projects(status);
CREATE INDEX IF NOT EXISTS projects_updated_at_idx ON projects(updated_at);

-- 8. 用户设置表
CREATE TABLE IF NOT EXISTS user_settings (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL UNIQUE,
  dashscope_api_key TEXT DEFAULT '',
  openai_api_key TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  settings JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS user_settings_user_id_idx ON user_settings(user_id);

-- 9. 用户积分表
CREATE TABLE IF NOT EXISTS user_credits (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL UNIQUE,
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_recharged NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_consumed NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_credits_user_id_idx ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS user_credits_balance_idx ON user_credits(balance);

-- 10. 积分交易记录表
CREATE TABLE IF NOT EXISTS credit_transactions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL,
  type VARCHAR(20) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  balance_after NUMERIC(12, 2) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  model VARCHAR(100),
  related_id VARCHAR(36),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS credit_transactions_user_id_idx ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS credit_transactions_type_idx ON credit_transactions(type);
CREATE INDEX IF NOT EXISTS credit_transactions_created_at_idx ON credit_transactions(created_at);

-- 11. 模型定价表
CREATE TABLE IF NOT EXISTS model_pricing (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  model_key VARCHAR(100) NOT NULL UNIQUE,
  model_name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  cost_per_call NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  cost_per_token NUMERIC(10, 6) DEFAULT 0.000000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS model_pricing_category_idx ON model_pricing(category);
CREATE INDEX IF NOT EXISTS model_pricing_is_active_idx ON model_pricing(is_active);

-- 12. 平台API Key表
CREATE TABLE IF NOT EXISTS platform_api_keys (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  base_url VARCHAR(255),
  models JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS platform_api_keys_platform_idx ON platform_api_keys(platform);
CREATE INDEX IF NOT EXISTS platform_api_keys_is_active_idx ON platform_api_keys(is_active);

-- 13. 聊天会话表
CREATE TABLE IF NOT EXISTS chat_sessions (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(255) NOT NULL DEFAULT '',
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS chat_sessions_created_at_idx ON chat_sessions(created_at);

-- ============================================
-- 启用 RLS (Row Level Security)
-- ============================================
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_api_keys ENABLE ROW LEVEL SECURITY;

-- Assets 表的 RLS 策略
CREATE POLICY "Users can view own assets" ON assets FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own assets" ON assets FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own assets" ON assets FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own assets" ON assets FOR DELETE USING (auth.uid()::text = user_id);

-- User Settings 表的 RLS 策略
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid()::text = user_id);

-- ============================================
-- 完成提示
-- ============================================
-- 表创建完成后，你应该能看到以下 13 张表：
-- health_check, characters, generations, workflows, assets, scripts, 
-- projects, user_settings, user_credits, credit_transactions, 
-- model_pricing, platform_api_keys, chat_sessions
