import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getUserId } from '@/lib/server-auth';

function toCamelCase(g: Record<string, unknown>) {
  return {
    id: g.id,
    type: g.type,
    prompt: g.prompt,
    model: g.model,
    params: g.params || {},
    results: g.results || [],
    createdAt: g.created_at,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const client = getSupabaseClient();
  const userId = await getUserId(request as NextRequest);
  let query = client
    .from('generations')
    .select('id, type, prompt, model, params, results, created_at')
    .order('created_at', { ascending: false });
  if (type) {
    query = query.eq('type', type);
  }
  if (userId) {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query;
  if (error) throw new Error(`查询创作历史失败: ${error.message}`);
  return NextResponse.json({ success: true, data: (data || []).map(toCamelCase) });
}

export async function POST(request: Request) {
  const body = await request.json();
  const userId = await getUserId(request as NextRequest);
  if (userId) body.user_id = userId;
  const client = getSupabaseClient();
  const insertPayload: Record<string, unknown> = {
    type: body.type || 'image',
    prompt: body.prompt || '',
    model: body.model || '',
    params: body.params || {},
    results: body.results || [],
    user_id: body.user_id || null,
  };
  const { data, error } = await client
    .from('generations')
    .insert(insertPayload)
    .select()
    .single();
  if (error) throw new Error(`保存创作历史失败: ${error.message}`);
  return NextResponse.json({ success: true, data: toCamelCase(data) }, { status: 201 });
}
