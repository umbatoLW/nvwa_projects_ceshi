import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getUserId } from '@/lib/server-auth';

function toCamelCase(project: Record<string, unknown>) {
  return {
    id: project.id,
    name: project.name,
    type: project.type,
    status: project.status,
    updatedAt: project.updated_at,
  };
}

export async function GET(request: Request) {
  const client = getSupabaseClient();
  const userId = await getUserId(request as NextRequest);
  let query = client
    .from('projects')
    .select('id, name, type, status, updated_at')
    .order('updated_at', { ascending: false });
  if (userId) {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query;
  if (error) throw new Error(`查询项目失败: ${error.message}`);
  return NextResponse.json({ success: true, data: (data || []).map(toCamelCase) });
}

export async function POST(request: Request) {
  const body = await request.json();
  const userId = await getUserId(request as NextRequest);
  if (userId) body.user_id = userId;
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('projects')
    .insert({
      name: body.name || '未命名项目',
      type: body.type || '短剧',
      status: body.status || '制作中',
      user_id: body.user_id || null,
    })
    .select()
    .single();
  if (error) throw new Error(`创建项目失败: ${error.message}`);
  return NextResponse.json({ success: true, data: toCamelCase(data) }, { status: 201 });
}
