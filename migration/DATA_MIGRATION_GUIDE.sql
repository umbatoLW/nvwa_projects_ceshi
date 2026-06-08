-- ============================================
-- 女娲短剧创作平台 - 数据迁移说明
-- ============================================

-- 当前 schema.sql 只包含表结构（CREATE TABLE）
-- 如需迁移数据，请按以下步骤操作：

-- ============================================
-- 方法一：从 Supabase 控制台导出
-- ============================================

-- 1. 登录 Supabase 控制台
--    URL: https://supabase.com/dashboard
--    或使用扣子内置数据库控制台

-- 2. 进入 SQL Editor

-- 3. 执行以下查询获取所有数据：

-- 导出剧本数据
SELECT * FROM scripts;

-- 导出角色数据
SELECT * FROM characters;

-- 导出资产数据
SELECT * FROM assets;

-- 导出项目数据
SELECT * FROM projects;

-- 导出工作流数据
SELECT * FROM workflows;

-- 导出生成记录
SELECT * FROM generations;

-- 导出用户设置
SELECT * FROM user_settings;

-- 4. 使用 Supabase 的 "Export to SQL" 功能生成 INSERT 语句

-- ============================================
-- 方法二：使用 API 导出数据
-- ============================================

-- 调用以下 API 获取数据：

-- 剧本列表
-- GET /api/scripts

-- 角色列表
-- GET /api/characters

-- 资产列表
-- GET /api/assets

-- ============================================
-- 方法三：手动生成 INSERT 语句模板
-- ============================================

-- 以下是 INSERT 语句模板，请填入实际数据：

-- 剧本数据
-- INSERT INTO scripts (id, user_id, title, genre, logline, main_characters, villains, episodes, episode_count, content, outline, metadata, status, created_at, updated_at)
-- VALUES (
--   'uuid-here',
--   'user-id-here',
--   '剧名',
--   '类型',
--   '一句话梗概',
--   '[]'::jsonb,
--   '[]'::jsonb,
--   '[]'::jsonb,
--   1,
--   '剧本内容',
--   '{}'::jsonb,
--   '{}'::jsonb,
--   'draft',
--   NOW(),
--   NOW()
-- );

-- 角色数据
-- INSERT INTO characters (id, user_id, script_id, name, role, description, appearance, personality, backstory, avatar_url, reference_images, expressions, consistency_anchor, metadata, created_at, updated_at)
-- VALUES (
--   'uuid-here',
--   'user-id-here',
--   'script-uuid-here',
--   '角色名',
--   '主角/配角/反派',
--   '描述',
--   '外貌描述',
--   '性格描述',
--   '背景故事',
--   '头像URL',
--   '[]'::jsonb,
--   '{}'::jsonb,
--   NULL,
--   '{}'::jsonb,
--   NOW(),
--   NOW()
-- );

-- 资产数据
-- INSERT INTO assets (id, user_id, script_id, character_id, name, type, category, url, tags, uses, prompt, model, metadata, created_at)
-- VALUES (
--   'uuid-here',
--   'user-id-here',
--   'script-uuid-here',
--   NULL,
--   '资产名称',
--   'image',
--   'media',
--   'https://asset-url.com/file.jpg',
--   '[]'::jsonb,
--   0,
--   '生成提示词',
--   'wan2.7-image-pro',
--   '{}'::jsonb,
--   NOW()
-- );

-- ============================================
-- 重要说明
-- ============================================

-- 1. 新账号的 user_id 会不同，需要更新为新账号的用户ID
-- 2. UUID 可以保持不变，或重新生成
-- 3. 外键关系（script_id, character_id）需要保持一致
-- 4. 对象存储的资产URL可以继续使用（如果是公开URL）

-- ============================================
-- 迁移后验证
-- ============================================

-- 验证数据迁移成功
SELECT COUNT(*) as script_count FROM scripts;
SELECT COUNT(*) as character_count FROM characters;
SELECT COUNT(*) as asset_count FROM assets;
