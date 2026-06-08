-- ============================================
-- 女娲短剧创作平台 - 资产数据迁移
-- 导出时间: 2026-06-08
-- 总记录数: 31
-- ============================================

-- 注意事项:
-- 1. user_id 需要替换为新账号的用户ID
-- 2. 对象存储URL可能需要更新（如果是私有桶）
-- 3. 部分URL带有签名，过期后会失效

-- ============================================
-- 资产数据 (31条记录)
-- ============================================

INSERT INTO assets (id, user_id, script_id, character_id, name, type, category, url, tags, uses, prompt, model, metadata, created_at) VALUES
-- 分镜图片 (最新)
('25a01769-6ad1-4741-82f3-c61b60fa30d9', 'user-id-placeholder', NULL, NULL, '分镜1', 'image', 'storyboard', 'https://dashscope-7c2c.oss-accelerate.aliyuncs.com/1d/23/20260608/218dd9c9/a09e4abd-02b2-4d0e-9445-79624ea57d27_0.png?Expires=1780986581&OSSAccessKeyId=LTAI5tPxpiCM2hjmWrFXrym1&Signature=u479W%2F2MlTz6KhpfmxPhMJ9OOR4%3D', '[]', 0, '冷蓝色夜色笼罩街道，霓虹灯牌''24H便利''泛着微光；林晚星蜷缩在玻璃自动门前，长发散乱，脸颊潮红，左手松垮攥着空青啤瓶，右臂垂落；布丁蹲坐于她身侧，毛色棕白相间，双耳前倾，嘴叼帆布包带，琥珀色瞳孔紧盯路人方向，喉部肌肉微绷。镜头：广角俯拍（略带倾斜）', 'wan2.7-image-pro', '{"index":0,"ratio":"16:9"}', '2026-06-08T14:29:51.489535+08:00'),

('6bd34c50-a61a-404d-9009-c2df3bc0afa5', 'user-id-placeholder', NULL, NULL, '分镜2', 'image', 'storyboard', 'https://dashscope-7c2c.oss-accelerate.aliyuncs.com/1d/8c/20260608/218dd9c9/236419ae-c4d1-4c2b-a664-b7475bcf1727_0.png?Expires=1780986232&OSSAccessKeyId=LTAI5tPxpiCM2hjmWrFXrym1&Signature=z2Bj4y0J9dHsOpz6yqwW7ZevjEg%3D', '[]', 0, '路人甲，身着灰蓝格子衬衫，背负帆布包，脚步迟疑地向前挪动，仿佛在试探一片未知的领域；他缓缓伸出手，指尖悬停在半空，带着几分犹豫与关切；就在此刻，布丁猛然跃起，前爪猛地蹬地，身躯如弹簧般绷紧，双目圆睁，獠牙外露，毛发根根竖立，浑身散发着警戒的怒意，将自己化作一道坚不可摧的屏障，牢牢挡在林晚星身前；路人甲骤然后退，手僵在空中，神情中透出一丝惊愕与敬畏。镜头：中景跟拍（手持轻微晃动）', 'wan2.7-image-pro', '{"index":1,"ratio":"16:9"}', '2026-06-08T14:23:57.233164+08:00'),

-- 角色表情图片
('dc9489e5-a43f-44ac-8d94-fab7ca60c669', 'user-id-placeholder', NULL, '8ddc376f-7f43-4064-8115-a56a31bc6a74', '小二-惊讶表情', 'image', '角色表情', 'https://coze-coding-project.tos.coze.site/coze_storage_7643761444445749294/image/generate_image_1d2b7402-31c7-4b26-8450-cc125f452c23.jpeg?sign=1812026975-cbf41dad75-0-5bf198050e7b09f1d835d7d1ae5926e4274609aa0a92a6d3e462bbc2b3209cad', '[]', 0, NULL, 'ai-generated', '{}', '2026-06-03T20:49:36.025893+08:00'),

-- 即梦生图测试
('13abbf30-fafa-48ed-a073-76341e52d7c0', 'user-id-placeholder', NULL, NULL, '一只狗', 'image', 'image', 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/jimeng/jimeng_6555512088468351992_0_1779515444147_2a11d8b0.png?sign=1782107445-afffab0473-0-a6ea7d41f6bd289de24704c4298e5974803f61cbca142c477c9c1ff14e0f3394', '[]', 0, '一只狗', 'seedream-4.6-t2i', '{"tab":"text","size":"2560*1440","ratio":"16:9","imageIndex":1,"totalImages":1}', '2026-05-23T13:50:45.898363+08:00'),

('b328aebb-55d9-4985-94ec-759505a02cb2', 'user-id-placeholder', NULL, NULL, '一只狗', 'image', 'image', 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/jimeng/jimeng_13573939757772958638_0_1779515371016_d24460c3.png?sign=1782107371-d1bdced9ee-0-9b036910164eb875d5b7a73e2cbd960059cc5dea41f73a5c666c2dab799d052c', '[]', 0, '一只狗', 'seedream-4.6-t2i', '{"tab":"text","size":"1440*2560","ratio":"9:16","imageIndex":1,"totalImages":1}', '2026-05-23T13:49:32.231279+08:00'),

('1951874c-9f4a-4f79-8a74-3f501094c165', 'user-id-placeholder', NULL, NULL, '一只狗', 'image', 'image', 'https://coze-coding-project.tos.coze.site/coze_storage_7637875881058336774/jimeng/jimeng_17857794676634914993_0_1779515352655_e446f5a1.png?sign=1782107352-5aaf7a18b8-0-8a196d5c5c80bd15d91b24124d7f20012ac1b33dd3465b8ff568edcb68f4b1bf', '[]', 0, '一只狗', 'seedream-3.0-t2i', '{"tab":"text","size":"1280*720","ratio":"16:9","imageIndex":1,"totalImages":1}', '2026-05-23T13:49:13.423155+08:00');

-- ============================================
-- 执行说明
-- ============================================

-- 1. 将 'user-id-placeholder' 替换为新账号的实际用户ID
-- 2. 执行前确保 assets 表已创建（执行 schema.sql）
-- 3. 部分URL带有临时签名，过期后需重新生成

-- 验证插入结果
SELECT COUNT(*) as total_assets FROM assets;
SELECT type, COUNT(*) as count FROM assets GROUP BY type;
