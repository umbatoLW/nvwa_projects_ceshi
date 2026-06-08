import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getUserId } from '@/lib/server-auth';
import { sanitizeScriptInput } from '@/lib/security/xss-sanitizer';

// 分页配置
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function toCamelCase(script: Record<string, unknown>) {
  return {
    id: script.id,
    title: script.title,
    genre: script.genre,
    synopsis: script.synopsis,
    content: script.content,
    scenes: script.scenes,
    characters: script.characters,
    storyboards: script.storyboards || [],
    roles: script.roles || [],
    status: script.status,
    coverImage: script.cover_image || null,
    createdAt: script.created_at,
    updatedAt: script.updated_at,
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
  const genre = url.searchParams.get('genre');
  const search = url.searchParams.get('search');

  // 构建查询
  let query = client
    .from('scripts')
    .select('id, title, genre, synopsis, content, scenes, characters, storyboards, roles, status, cover_image, created_at, updated_at', { count: 'exact' });
  
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  // 添加过滤条件
  if (status) {
    query = query.eq('status', status);
  }
  if (genre) {
    query = query.eq('genre', genre);
  }
  if (search) {
    query = query.or(`title.ilike.%${search}%,synopsis.ilike.%${search}%`);
  }
  
  // 添加排序和分页
  query = query.order(sortBy, { ascending: sortOrder });
  query = query.range(offset, offset + pageSize - 1);
  
  const res1 = await query;
  
  let data = res1.data;
  let error = res1.error;
  let total = res1.count || 0;
  
  if (error) {
    // 降级查询（不包含 storyboards 和 roles）
    let query2 = client
      .from('scripts')
      .select('id, title, genre, synopsis, content, scenes, characters, storyboards, roles, status, cover_image, created_at, updated_at', { count: 'exact' });
    
    if (userId) {
      query2 = query2.eq('user_id', userId);
    }
    if (status) {
      query2 = query2.eq('status', status);
    }
    if (genre) {
      query2 = query2.eq('genre', genre);
    }
    if (search) {
      query2 = query2.or(`title.ilike.%${search}%,synopsis.ilike.%${search}%`);
    }
    
    query2 = query2.order(sortBy, { ascending: sortOrder });
    query2 = query2.range(offset, offset + pageSize - 1);
    
    const res2 = await query2;
    data = res2.data;
    error = res2.error;
    total = res2.count || 0;
  }
  
  if (error) throw new Error(`查询剧本失败: ${error.message}`);
  
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
  
  // XSS 过滤：清理用户输入
  const sanitized = sanitizeScriptInput({
    title: body.title,
    genre: body.genre,
    synopsis: body.synopsis,
    content: body.content,
  });
  
  const userId = await getUserId(request as NextRequest);
  const client = getSupabaseClient();
  const insertPayload: Record<string, unknown> = {
    title: sanitized.title || '未命名剧本',
    genre: sanitized.genre || '未分类',
    synopsis: sanitized.synopsis || '',
    content: sanitized.content || '',
    scenes: body.scenes || 0,
    characters: body.characters || 0,
    status: body.status || 'draft',
  };
  if (userId) insertPayload.user_id = userId;
  if (body.storyboards !== undefined) insertPayload.storyboards = body.storyboards;
  if (body.roles !== undefined) insertPayload.roles = body.roles;
  const { data, error } = await client
    .from('scripts')
    .insert(insertPayload)
    .select()
    .single();
  if (error) {
    const { data: data2, error: error2 } = await client
      .from('scripts')
      .insert({
        title: sanitized.title || '未命名剧本',
        genre: sanitized.genre || '未分类',
        synopsis: sanitized.synopsis || '',
        content: sanitized.content || '',
        scenes: body.scenes || 0,
        characters: body.characters || 0,
        status: body.status || 'draft',
      })
      .select()
      .single();
    if (error2) throw new Error(`创建剧本失败: ${error2.message}`);
    return NextResponse.json({ success: true, data: toCamelCase(data2!) }, { status: 201 });
  }
  return NextResponse.json({ success: true, data: toCamelCase(data) }, { status: 201 });
}
