import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('projects')
    .select('id, name, type, status, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`查询项目失败: ${error.message}`);
  if (!data) {
    return NextResponse.json({ success: false, error: '项目不存在' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: toCamelCase(data) });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const client = getSupabaseClient();
  const updatePayload: Record<string, unknown> = {};
  if ('name' in body) updatePayload.name = body.name;
  if ('description' in body) updatePayload.description = body.description;
  if ('type' in body) updatePayload.type = body.type;
  if ('status' in body) updatePayload.status = body.status;

  const { data, error } = await client
    .from('projects')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error(`更新项目失败: ${error.message}`);
  if (!data) {
    return NextResponse.json({ success: false, error: '项目不存在' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: toCamelCase(data) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = getSupabaseClient();
  const { error } = await client.from('projects').delete().eq('id', id);
  if (error) throw new Error(`删除项目失败: ${error.message}`);
  return NextResponse.json({ success: true });
}
