import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getUserId } from '@/lib/server-auth';
import { seedWorkflows } from '@/lib/store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toClient(data: any): any {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(toClient);
  return {
    ...data,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function GET(request: Request) {
  const supabase = getSupabaseClient();
  const userId = await getUserId(request as NextRequest);
  let query = supabase
    .from('workflows')
    .select('id, name, nodes, edges, status, created_at, updated_at');
  if (userId) {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query.order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: '获取工作流列表失败' },
      { status: 500 }
    );
  }

  const list = data && data.length > 0 ? toClient(data) : seedWorkflows;
  return NextResponse.json({ success: true, data: list });
}

export async function POST(request: Request) {
  const body = await request.json();
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('workflows')
    .insert({
      name: body.name || '未命名工作流',
      nodes: body.nodes || [],
      edges: body.edges || [],
      status: body.status || 'active',
    })
    .select('id, name, nodes, edges, status, created_at, updated_at')
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: '创建工作流失败: ' + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: toClient(data) }, { status: 201 });
}
