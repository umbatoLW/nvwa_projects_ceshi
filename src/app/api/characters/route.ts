import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getUserId } from '@/lib/server-auth';

// 分页配置
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function toCamelCase(char: Record<string, unknown>) {
  return {
    id: char.id,
    name: char.name,
    avatar: char.avatar,
    description: char.description,
    personality: char.personality,
    tags: char.tags,
    views: char.views,
    expressions: char.expressions,
    consistencyAnchor: char.consistency_anchor,
    forbiddenFeatures: char.forbidden_features,
    scriptId: char.script_id,
    status: char.status,
    createdAt: char.created_at,
  };
}

export async function GET(request: Request) {
  const client = getSupabaseClient();
  const userId = await getUserId(request as NextRequest);
  
  // 解析分页参数
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || String(DEFAULT_PAGE)));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(url.searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE))));
  const offset = (page - 1) * pageSize;
  
  // 解析排序参数
  const sortBy = url.searchParams.get('sortBy') || 'created_at';
  const sortOrder = url.searchParams.get('sortOrder') === 'asc' ? true : false;
  
  // 解析过滤参数
  const status = url.searchParams.get('status');
  const search = url.searchParams.get('search');

  // 构建查询
  let query = client
    .from('characters')
    .select('id, name, avatar, description, personality, tags, views, expressions, consistency_anchor, forbidden_features, status, created_at', { count: 'exact' });
  
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  // 添加过滤条件
  if (status) {
    query = query.eq('status', status);
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }
  
  // 添加排序和分页
  query = query.order(sortBy, { ascending: sortOrder });
  query = query.range(offset, offset + pageSize - 1);
  
  const res1 = await query;
  
  let data = res1.data;
  let error = res1.error;
  let total = res1.count || 0;
  
  if (error) {
    // 降级查询
    let query2 = client
      .from('characters')
      .select('id, name, avatar, description, personality, tags, views, expressions, consistency_anchor, forbidden_features, status, created_at', { count: 'exact' });
    
    if (userId) {
      query2 = query2.eq('user_id', userId);
    }
    if (status) {
      query2 = query2.eq('status', status);
    }
    if (search) {
      query2 = query2.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    query2 = query2.order(sortBy, { ascending: sortOrder });
    query2 = query2.range(offset, offset + pageSize - 1);
    
    const res2 = await query2;
    data = res2.data;
    error = res2.error;
    total = res2.count || 0;
  }
  
  if (error) {
    console.error('查询角色失败:', error);
    return NextResponse.json({ 
      success: false, 
      error: `查询角色失败: ${error.message}`,
      data: [],
      pagination: { page, pageSize, total: 0, totalPages: 0, hasMore: false }
    }, { status: 500 });
  }
  
  // 返回分页结果
  return NextResponse.json({ 
    success: true, 
    data: (data || []).map(toCamelCase),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasMore: offset + pageSize < total,
    }
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const userId = await getUserId(request as NextRequest);
  if (userId) body.user_id = userId;
  const client = getSupabaseClient();
  const insertPayload: Record<string, unknown> = {
    name: body.name || '未命名角色',
    avatar: body.avatar || '',
    description: body.description || '',
    personality: body.personality || '',
    tags: body.tags || [],
    views: body.views || [],
    expressions: body.expressions || [],
    status: body.status || 'draft',
  };
  if (body.consistencyAnchor !== undefined) insertPayload.consistency_anchor = body.consistencyAnchor;
  if (body.forbiddenFeatures !== undefined) insertPayload.forbidden_features = body.forbiddenFeatures;
  if (body.user_id) insertPayload.user_id = body.user_id;
  // 支持关联剧本
  if (body.scriptId) insertPayload.script_id = body.scriptId;
  const { data, error } = await client
    .from('characters')
    .insert(insertPayload)
    .select()
    .single();
  if (error) {
    // Fallback: try without new columns
    const { data: data2, error: error2 } = await client
      .from('characters')
      .insert({
        name: body.name || '未命名角色',
        avatar: body.avatar || '',
        description: body.description || '',
        personality: body.personality || '',
        tags: body.tags || [],
        views: body.views || [],
        expressions: body.expressions || [],
        status: body.status || 'draft',
      })
      .select()
      .single();
    if (error2) throw new Error(`创建角色失败: ${error2.message}`);
    return NextResponse.json({ success: true, data: toCamelCase(data2!) });
  }
  return NextResponse.json({ success: true, data: toCamelCase(data) }, { status: 201 });
}
