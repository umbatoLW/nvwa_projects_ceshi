import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getUserId } from '@/lib/server-auth';

// 分页配置
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const typeMap: Record<string, string> = {
  image: '图片',
  video: '视频',
  audio: '音频',
  costume: '服装',
  prop: '道具',
  scene: '场景',
};

// 反向映射：英文转中文
const typeToChinese: Record<string, string> = {
  image: '图片',
  video: '视频',
  audio: '音频',
  costume: '服装',
  prop: '道具',
  scene: '场景',
  图片: '图片',
  视频: '视频',
  音频: '音频',
  服装: '服装',
  道具: '道具',
  场景: '场景',
};

// 资产分类映射
const categoryMap: Record<string, string> = {
  costume: '服装',
  prop: '道具',
  scene: '场景',
  media: '媒体',
};

function toCamelCase(asset: Record<string, unknown>) {
  return {
    id: asset.id,
    name: asset.name,
    type: typeMap[String(asset.type)] || String(asset.type) || '图片',
    category: categoryMap[String(asset.category)] || String(asset.category) || '媒体',
    url: asset.url,
    tags: asset.tags,
    uses: asset.uses,
    scriptId: asset.script_id,
    characterId: asset.character_id,
    prompt: asset.prompt,
    model: asset.model,
    metadata: asset.metadata,
    createdAt: asset.created_at,
  };
}

export async function GET(request: Request) {
  const client = getSupabaseClient();
  const userId = await getUserId(request as NextRequest);
  const url = new URL(request.url);
  
  // 解析分页参数
  const page = Math.max(1, parseInt(url.searchParams.get('page') || String(DEFAULT_PAGE)));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(url.searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE))));
  const offset = (page - 1) * pageSize;
  
  // 解析排序参数
  const sortBy = url.searchParams.get('sortBy') || 'created_at';
  const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? true : false;
  
  // 解析过滤参数
  const scriptId = url.searchParams.get('scriptId');
  const category = url.searchParams.get('category');
  const assetType = url.searchParams.get('type');
  const search = url.searchParams.get('search');
  
  // 构建查询
  let query = client
    .from('assets')
    .select('id, name, type, category, url, tags, uses, script_id, character_id, prompt, model, metadata, created_at', { count: 'exact' });
  
  if (userId) {
    query = query.eq('user_id', userId);
  }
  if (scriptId) {
    query = query.eq('script_id', scriptId);
  }
  if (category) {
    query = query.eq('category', category);
  }
  if (assetType) {
    query = query.eq('type', typeToChinese[assetType] || assetType);
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,prompt.ilike.%${search}%`);
  }
  
  // 添加排序和分页
  query = query.order(sortBy, { ascending: sortOrder });
  query = query.range(offset, offset + pageSize - 1);
  
  const { data, error, count } = await query;
  if (error) {
    console.error('查询资产失败:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: `查询资产失败: ${error.message}`,
      data: [],
      pagination: { page, pageSize, total: 0, totalPages: 0, hasMore: false }
    });
  }
  
  // 返回分页结果
  return NextResponse.json({ 
    success: true, 
    data: (data || []).map(toCamelCase),
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
      hasMore: offset + pageSize < (count || 0),
    }
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const userId = await getUserId(request as NextRequest);
  if (userId) body.user_id = userId;
  const rawType = body.type || 'image';
  const mappedType = typeMap[rawType] || rawType;
  const client = getSupabaseClient();
  const insertPayload: Record<string, unknown> = {
    name: body.name || '未命名资产',
    type: mappedType,
    category: body.category || 'media',
    url: body.url || '',
    tags: body.tags || [],
    uses: 0,
    user_id: body.user_id || null,
  };
  // 支持关联剧本和角色
  if (body.scriptId) insertPayload.script_id = body.scriptId;
  if (body.characterId) insertPayload.character_id = body.characterId;
  // 支持prompt, model, metadata字段
  if (body.prompt) insertPayload.prompt = body.prompt;
  if (body.model) insertPayload.model = body.model;
  if (body.metadata) insertPayload.metadata = body.metadata;
  
  const { data, error } = await client
    .from('assets')
    .insert(insertPayload)
    .select()
    .single();
  if (error) throw new Error(`创建资产失败: ${error.message}`);
  return NextResponse.json({ success: true, data: toCamelCase(data) }, { status: 201 });
}

