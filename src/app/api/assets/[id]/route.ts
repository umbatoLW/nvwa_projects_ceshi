import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { deleteStorageFile } from '@/lib/storage-utils';

function toCamelCase(asset: Record<string, unknown>) {
  return {
    id: asset.id,
    name: asset.name,
    type: asset.type,
    category: asset.category,
    url: asset.url,
    tags: asset.tags,
    uses: asset.uses,
    scriptId: asset.script_id,
    characterId: asset.character_id,
    createdAt: asset.created_at,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('assets')
    .select('id, name, type, category, url, tags, uses, script_id, character_id, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`查询资产失败: ${error.message}`);
  if (!data) {
    return NextResponse.json({ success: false, error: '资产不存在' }, { status: 404 });
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
  if ('type' in body) updatePayload.type = body.type;
  if ('category' in body) updatePayload.category = body.category;
  if ('url' in body) updatePayload.url = body.url;
  if ('tags' in body) updatePayload.tags = body.tags;
  if ('scriptId' in body) updatePayload.script_id = body.scriptId;
  if ('characterId' in body) updatePayload.character_id = body.characterId;

  const { data, error } = await client
    .from('assets')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error(`更新资产失败: ${error.message}`);
  if (!data) {
    return NextResponse.json({ success: false, error: '资产不存在' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: toCamelCase(data) });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = getSupabaseClient();

  // 1. 先查询资产信息，获取url字段
  const { data: asset, error: queryError } = await client
    .from('assets')
    .select('url, type')
    .eq('id', id)
    .maybeSingle();

  if (queryError) {
    console.error('[Assets API] 查询资产失败:', queryError.message);
    throw new Error(`查询资产失败: ${queryError.message}`);
  }

  // 2. 如果资产存在且有url，尝试删除云存储文件
  if (asset?.url) {
    const deleteResult = await deleteStorageFile(asset.url);
    if (!deleteResult.success) {
      console.error('[Assets API] 云存储文件删除失败:', deleteResult.error);
      // 不阻塞数据库删除，仅记录错误
    }
  }

  // 3. 删除数据库记录
  const { error } = await client.from('assets').delete().eq('id', id);
  if (error) throw new Error(`删除资产失败: ${error.message}`);
  return NextResponse.json({ success: true });
}
