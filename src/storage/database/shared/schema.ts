import { pgTable, serial, timestamp, index, varchar, text, jsonb, uuid, pgPolicy, integer, unique, numeric, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const characters = pgTable("characters", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	name: varchar({ length: 128 }).notNull(),
	avatar: text().default("").notNull(),
	description: text().default("").notNull(),
	personality: text().default("").notNull(),
	tags: jsonb().default([]).notNull(),
	views: jsonb().default([]).notNull(),
	expressions: jsonb().default([]).notNull(),
	status: varchar({ length: 20 }).default('draft').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	userId: varchar("user_id", { length: 36 }),
	forbiddenFeatures: text("forbidden_features").default(""),
	consistencyAnchor: text("consistency_anchor").default(""),
}, (table) => [
	index("characters_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("characters_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const generations = pgTable("generations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	type: varchar({ length: 20 }).notNull(),
	prompt: text(),
	model: varchar({ length: 100 }),
	params: jsonb(),
	results: jsonb(),
	userId: varchar("user_id", { length: 36 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const workflows = pgTable("workflows", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	nodes: jsonb().default([]).notNull(),
	edges: jsonb().default([]).notNull(),
	status: varchar({ length: 50 }).default("").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	userId: varchar("user_id", { length: 36 }),
}, (table) => [
	index("workflows_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("workflows_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const assets = pgTable("assets", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	type: varchar({ length: 50 }).default('image').notNull(),
	url: text().default("").notNull(),
	tags: jsonb().default([]).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	userId: varchar("user_id", { length: 36 }),
	uses: integer().default(0).notNull(),
	category: varchar({ length: 50 }).default('media'),
	scriptId: varchar("script_id", { length: 36 }),
	characterId: varchar("character_id", { length: 36 }),
	prompt: text(),
	model: varchar({ length: 100 }),
	metadata: jsonb().default({}),
}, (table) => [
	index("assets_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("assets_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("assets_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
	index("assets_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	pgPolicy("Users can delete own assets", { as: "permissive", for: "delete", to: ["public"], using: sql`((auth.uid())::text = (user_id)::text)` }),
	pgPolicy("Users can update own assets", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can insert own assets", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can view own assets", { as: "permissive", for: "select", to: ["public"] }),
]);

export const scripts = pgTable("scripts", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	genre: varchar({ length: 100 }).default("").notNull(),
	synopsis: text().default("").notNull(),
	content: text().default("").notNull(),
	scenes: integer().default(0).notNull(),
	characters: integer().default(0).notNull(),
	status: varchar({ length: 20 }).default('draft').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	userId: varchar("user_id", { length: 36 }),
	storyboards: jsonb().default([]),
	roles: jsonb().default([]),
	costumes: jsonb().default({}),
	extractedScenes: jsonb("extracted_scenes").default({}),
	props: jsonb().default({}),
	episodeCount: integer("episode_count").default(0),
	coverImage: text("cover_image").default("").notNull(),
	wordCount: integer("word_count").default(0),
	sceneCount: integer("scene_count").default(0),
}, (table) => [
	index("scripts_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("scripts_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const projects = pgTable("projects", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	type: varchar({ length: 100 }).default("").notNull(),
	status: varchar({ length: 50 }).default("").notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	userId: varchar("user_id", { length: 36 }),
}, (table) => [
	index("projects_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("projects_updated_at_idx").using("btree", table.updatedAt.asc().nullsLast().op("timestamptz_ops")),
]);

export const userSettings = pgTable("user_settings", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	userId: varchar("user_id", { length: 36 }).notNull(),
	dashscopeApiKey: text("dashscope_api_key").default(""),
	openaiApiKey: text("openai_api_key").default(""),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	settings: jsonb().default({}),
}, (table) => [
	index("user_settings_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	unique("user_settings_user_id_key").on(table.userId),
	pgPolicy("Users can update own settings", { as: "permissive", for: "update", to: ["public"], using: sql`((auth.uid())::text = (user_id)::text)` }),
	pgPolicy("Users can insert own settings", { as: "permissive", for: "insert", to: ["public"] }),
	pgPolicy("Users can view own settings", { as: "permissive", for: "select", to: ["public"] }),
]);

// ========== 积分系统表 ==========

// 用户积分余额表
export const userCredits = pgTable("user_credits", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	userId: varchar("user_id", { length: 36 }).notNull().unique(),
	balance: numeric("balance", { precision: 12, scale: 2 }).default("0.00").notNull(),
	totalRecharged: numeric("total_recharged", { precision: 12, scale: 2 }).default("0.00").notNull(),
	totalConsumed: numeric("total_consumed", { precision: 12, scale: 2 }).default("0.00").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("user_credits_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("user_credits_balance_idx").using("btree", table.balance.asc().nullsLast().op("numeric_ops")),
]);

// 积分交易记录表
export const creditTransactions = pgTable("credit_transactions", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	userId: varchar("user_id", { length: 36 }).notNull(),
	type: varchar({ length: 20 }).notNull(), // recharge: 充值, consume: 消费, refund: 退款, reward: 奖励
	amount: numeric("amount", { precision: 12, scale: 2 }).notNull(), // 正数增加，负数减少
	balanceAfter: numeric("balance_after", { precision: 12, scale: 2 }).notNull(),
	description: text().default("").notNull(),
	model: varchar({ length: 100 }), // 消费的模型（消费时）
	relatedId: varchar("related_id", { length: 36 }), // 关联ID（如生成记录ID）
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("credit_transactions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	index("credit_transactions_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
	index("credit_transactions_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
]);

// 模型定价配置表
export const modelPricing = pgTable("model_pricing", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	modelKey: varchar("model_key", { length: 100 }).notNull().unique(), // 模型标识，如 wan2.1-t2v-14b
	modelName: varchar("model_name", { length: 255 }).notNull(), // 显示名称
	category: varchar({ length: 50 }).notNull(), // image / video / 3d / edit / text
	costPerCall: numeric("cost_per_call", { precision: 10, scale: 2 }).default("0.00").notNull(), // 每次调用消耗积分
	costPerToken: numeric("cost_per_token", { precision: 10, scale: 6 }).default("0.000000"), // 每千token消耗积分（可选）
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("model_pricing_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("model_pricing_is_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
]);

// 平台API Key配置表（后台管理）
export const platformApiKeys = pgTable("platform_api_keys", {
	id: varchar({ length: 36 }).default(sql`gen_random_uuid()`).primaryKey().notNull(),
	platform: varchar({ length: 50 }).notNull().unique(), // aliyun, jimeng, vidu, kling
	apiKey: text("api_key").notNull(), // 加密存储
	baseUrl: varchar("base_url", { length: 255 }), // API基础URL
	models: jsonb().default([]).notNull(), // 该平台支持的模型列表
	isActive: boolean("is_active").default(true).notNull(),
	description: text().default(""), // 平台说明
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("platform_api_keys_platform_idx").using("btree", table.platform.asc().nullsLast().op("text_ops")),
	index("platform_api_keys_is_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
]);
