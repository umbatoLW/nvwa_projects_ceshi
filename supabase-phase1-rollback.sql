-- ============================================
-- Phase 1 回滚：删除新增表（谨慎执行，会丢失数据）
-- ============================================

-- 删除 RLS 策略
DROP POLICY IF EXISTS "Users can view own global_assets" ON global_assets;
DROP POLICY IF EXISTS "Users can insert own global_assets" ON global_assets;
DROP POLICY IF EXISTS "Users can update own global_assets" ON global_assets;
DROP POLICY IF EXISTS "Users can delete own global_assets" ON global_assets;

DROP POLICY IF EXISTS "Users can view own project_asset_refs" ON project_asset_refs;
DROP POLICY IF EXISTS "Users can insert own project_asset_refs" ON project_asset_refs;
DROP POLICY IF EXISTS "Users can update own project_asset_refs" ON project_asset_refs;
DROP POLICY IF EXISTS "Users can delete own project_asset_refs" ON project_asset_refs;

DROP POLICY IF EXISTS "Users can view own character_appearances" ON character_appearances;
DROP POLICY IF EXISTS "Users can insert own character_appearances" ON character_appearances;
DROP POLICY IF EXISTS "Users can update own character_appearances" ON character_appearances;
DROP POLICY IF EXISTS "Users can delete own character_appearances" ON character_appearances;

DROP POLICY IF EXISTS "Users can view own alternative_frames" ON alternative_frames;
DROP POLICY IF EXISTS "Users can insert own alternative_frames" ON alternative_frames;
DROP POLICY IF EXISTS "Users can update own alternative_frames" ON alternative_frames;
DROP POLICY IF EXISTS "Users can delete own alternative_frames" ON alternative_frames;

DROP POLICY IF EXISTS "Users can view own agent_memories" ON agent_memories;
DROP POLICY IF EXISTS "Users can insert own agent_memories" ON agent_memories;
DROP POLICY IF EXISTS "Users can update own agent_memories" ON agent_memories;
DROP POLICY IF EXISTS "Users can delete own agent_memories" ON agent_memories;

DROP POLICY IF EXISTS "Users can view own skill_files" ON skill_files;
DROP POLICY IF EXISTS "Users can insert own skill_files" ON skill_files;
DROP POLICY IF EXISTS "Users can update own skill_files" ON skill_files;
DROP POLICY IF EXISTS "Users can delete own skill_files" ON skill_files;

DROP POLICY IF EXISTS "Users can view own project_templates" ON project_templates;
DROP POLICY IF EXISTS "Users can insert own project_templates" ON project_templates;
DROP POLICY IF EXISTS "Users can update own project_templates" ON project_templates;
DROP POLICY IF EXISTS "Users can delete own project_templates" ON project_templates;

-- 删除表
DROP TABLE IF EXISTS project_templates;
DROP TABLE IF EXISTS skill_files;
DROP TABLE IF EXISTS agent_memories;
DROP TABLE IF EXISTS alternative_frames;
DROP TABLE IF EXISTS character_appearances;
DROP TABLE IF EXISTS project_asset_refs;
DROP TABLE IF EXISTS global_assets;

-- 回滚 user_settings 扩展字段
ALTER TABLE user_settings DROP COLUMN IF EXISTS llm_model;
ALTER TABLE user_settings DROP COLUMN IF EXISTS image_model;
ALTER TABLE user_settings DROP COLUMN IF EXISTS video_model;
ALTER TABLE user_settings DROP COLUMN IF EXISTS visual_style;
ALTER TABLE user_settings DROP COLUMN IF EXISTS default_tone;
ALTER TABLE user_settings DROP COLUMN IF EXISTS default_genre;
ALTER TABLE user_settings DROP COLUMN IF EXISTS default_total_episodes;
ALTER TABLE user_settings DROP COLUMN IF EXISTS default_episode_duration;
