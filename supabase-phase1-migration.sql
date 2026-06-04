-- ============================================
-- Phase 1 迁移：新增全局素材库、角色多形象、用户设置扩展、备选帧、Agent记忆、Skill文件、项目模板
-- 在 Supabase SQL Editor 中执行此脚本
-- ============================================

-- 1. 全局素材库（参考 LocalMiniDrama）
CREATE TABLE IF NOT EXISTS global_assets (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(36) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK(type IN ('character', 'scene', 'prop')),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT,
  tags JSONB DEFAULT '[]',
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_global_assets_user ON global_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_global_assets_type ON global_assets(type);

-- 2. 项目引用全局素材（LocalMiniDrama）
CREATE TABLE IF NOT EXISTS project_asset_refs (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(36) NOT NULL,
  global_asset_id VARCHAR(36) NOT NULL,
  role VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_asset_refs_project ON project_asset_refs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_asset_refs_asset ON project_asset_refs(global_asset_id);

-- 3. 角色多形象（参考 drama-workshop）
CREATE TABLE IF NOT EXISTS character_appearances (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id VARCHAR(36) NOT NULL,
  appearance_type VARCHAR(20) NOT NULL CHECK(appearance_type IN ('front', 'side', 'back', 'expression', 'action', 'grid_panel')),
  image_url TEXT NOT NULL,
  description TEXT,
  embedding TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_character_appearances_character ON character_appearances(character_id);
CREATE INDEX IF NOT EXISTS idx_character_appearances_type ON character_appearances(appearance_type);

-- 4. 用户级AI配置扩展（扩展 user_settings 表，添加新字段）
-- 注意：user_settings 表已存在，使用 ALTER TABLE 添加新字段
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS llm_model VARCHAR(50) DEFAULT 'qwen-plus';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS image_model VARCHAR(50) DEFAULT 'wanxiang-v2.1';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS video_model VARCHAR(50) DEFAULT 'seedance-2.0';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS visual_style VARCHAR(50) DEFAULT 'cinematic';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS default_tone VARCHAR(50) DEFAULT 'dramatic';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS default_genre VARCHAR(100) DEFAULT '都市甜宠';
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS default_total_episodes INTEGER DEFAULT 60;
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS default_episode_duration INTEGER DEFAULT 90;

-- 5. 备选帧（参考 ViMax）
CREATE TABLE IF NOT EXISTS alternative_frames (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  image_url TEXT NOT NULL,
  overall_score REAL,
  quality_scores JSONB,
  selection_strategy VARCHAR(30) CHECK(selection_strategy IN ('best_overall', 'best_consistency', 'best_aesthetic')),
  shot_id VARCHAR(36),
  project_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alternative_frames_project ON alternative_frames(project_id);
CREATE INDEX IF NOT EXISTS idx_alternative_frames_shot ON alternative_frames(shot_id);

-- 6. Agent记忆（参考 Toonflow）
CREATE TABLE IF NOT EXISTS agent_memories (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(36) NOT NULL,
  agent_type VARCHAR(30) NOT NULL CHECK(agent_type IN ('script', 'character', 'storyboard', 'image', 'video', 'audio', 'compose', 'summary')),
  content TEXT NOT NULL,
  embedding TEXT,
  memory_type VARCHAR(20) NOT NULL CHECK(memory_type IN ('short_term', 'long_term', 'summary')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  importance REAL DEFAULT 0.5
);
CREATE INDEX IF NOT EXISTS idx_agent_memories_project ON agent_memories(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_agent ON agent_memories(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_memories_type ON agent_memories(memory_type);

-- 7. Skill文件（参考 Toonflow）
CREATE TABLE IF NOT EXISTS skill_files (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  agent_type VARCHAR(30) NOT NULL CHECK(agent_type IN ('script', 'character', 'storyboard', 'image', 'video', 'audio', 'compliance', 'review')),
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_skill_files_agent ON skill_files(agent_type);
CREATE INDEX IF NOT EXISTS idx_skill_files_name ON skill_files(name);

-- 8. 项目模板（参考 AI Story）
CREATE TABLE IF NOT EXISTS project_templates (
  id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  character_templates JSONB DEFAULT '[]',
  prompt_templates JSONB DEFAULT '{}',
  created_by VARCHAR(36) NOT NULL,
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_templates_public ON project_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_project_templates_created_by ON project_templates(created_by);

-- ============================================
-- RLS 策略
-- ============================================
ALTER TABLE global_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_asset_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_appearances ENABLE ROW LEVEL SECURITY;
ALTER TABLE alternative_frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;

-- global_assets RLS
CREATE POLICY "Users can view own global_assets" ON global_assets FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert own global_assets" ON global_assets FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update own global_assets" ON global_assets FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete own global_assets" ON global_assets FOR DELETE USING (auth.uid()::text = user_id);

-- project_asset_refs RLS (通过 project 关联 user)
CREATE POLICY "Users can view own project_asset_refs" ON project_asset_refs FOR SELECT 
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()::text));
CREATE POLICY "Users can insert own project_asset_refs" ON project_asset_refs FOR INSERT 
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()::text));
CREATE POLICY "Users can update own project_asset_refs" ON project_asset_refs FOR UPDATE 
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()::text));
CREATE POLICY "Users can delete own project_asset_refs" ON project_asset_refs FOR DELETE 
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()::text));

-- character_appearances RLS (通过 character 关联 user)
CREATE POLICY "Users can view own character_appearances" ON character_appearances FOR SELECT 
  USING (character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()::text));
CREATE POLICY "Users can insert own character_appearances" ON character_appearances FOR INSERT 
  WITH CHECK (character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()::text));
CREATE POLICY "Users can update own character_appearances" ON character_appearances FOR UPDATE 
  USING (character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()::text));
CREATE POLICY "Users can delete own character_appearances" ON character_appearances FOR DELETE 
  USING (character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()::text));

-- alternative_frames RLS (通过 project 关联 user)
CREATE POLICY "Users can view own alternative_frames" ON alternative_frames FOR SELECT 
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()::text));
CREATE POLICY "Users can insert own alternative_frames" ON alternative_frames FOR INSERT 
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()::text));
CREATE POLICY "Users can update own alternative_frames" ON alternative_frames FOR UPDATE 
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()::text));
CREATE POLICY "Users can delete own alternative_frames" ON alternative_frames FOR DELETE 
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()::text));

-- agent_memories RLS (通过 project 关联 user)
CREATE POLICY "Users can view own agent_memories" ON agent_memories FOR SELECT 
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()::text));
CREATE POLICY "Users can insert own agent_memories" ON agent_memories FOR INSERT 
  WITH CHECK (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()::text));
CREATE POLICY "Users can update own agent_memories" ON agent_memories FOR UPDATE 
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()::text));
CREATE POLICY "Users can delete own agent_memories" ON agent_memories FOR DELETE 
  USING (project_id IN (SELECT id FROM projects WHERE user_id = auth.uid()::text));

-- skill_files RLS
CREATE POLICY "Users can view own skill_files" ON skill_files FOR SELECT USING (auth.uid()::text = created_by);
CREATE POLICY "Users can insert own skill_files" ON skill_files FOR INSERT WITH CHECK (auth.uid()::text = created_by);
CREATE POLICY "Users can update own skill_files" ON skill_files FOR UPDATE USING (auth.uid()::text = created_by);
CREATE POLICY "Users can delete own skill_files" ON skill_files FOR DELETE USING (auth.uid()::text = created_by);

-- project_templates RLS
CREATE POLICY "Users can view own project_templates" ON project_templates FOR SELECT USING (auth.uid()::text = created_by OR is_public = true);
CREATE POLICY "Users can insert own project_templates" ON project_templates FOR INSERT WITH CHECK (auth.uid()::text = created_by);
CREATE POLICY "Users can update own project_templates" ON project_templates FOR UPDATE USING (auth.uid()::text = created_by);
CREATE POLICY "Users can delete own project_templates" ON project_templates FOR DELETE USING (auth.uid()::text = created_by);

-- ============================================
-- 完成提示
-- ============================================
-- Phase 1 新增 7 张表：
-- global_assets, project_asset_refs, character_appearances,
-- alternative_frames, agent_memories, skill_files, project_templates
-- 并扩展了 user_settings 表的字段
