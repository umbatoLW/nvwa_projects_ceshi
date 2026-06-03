import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { deleteStorageFile } from '@/lib/storage-utils';

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = getSupabaseClient();
  let data = null;
  let error = null;
  // Try with new columns first, fallback to basic columns
  const res1 = await client
    .from('characters')
    .select('id, name, avatar, description, personality, tags, views, expressions, consistency_anchor, forbidden_features, status, created_at')
    .eq('id', id)
    .maybeSingle();
  if (res1.error) {
    const res2 = await client
      .from('characters')
      .select('id, name, avatar, description, personality, tags, views, expressions, status, created_at')
      .eq('id', id)
      .maybeSingle();
    data = res2.data;
    error = res2.error;
  } else {
    data = res1.data;
  }
  if (error) throw new Error(`查询角色失败: ${error.message}`);
  if (!data) {
    return NextResponse.json({ success: false, error: '角色不存在' }, { status: 404 });
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
  if ('avatar' in body) updatePayload.avatar = body.avatar;
  if ('description' in body) updatePayload.description = body.description;
  if ('personality' in body) updatePayload.personality = body.personality;
  if ('tags' in body) updatePayload.tags = body.tags;
  if ('views' in body) updatePayload.views = body.views;
  if ('consistencyAnchor' in body) updatePayload.consistency_anchor = body.consistencyAnchor;
  if ('forbiddenFeatures' in body) updatePayload.forbidden_features = body.forbiddenFeatures;
  if ('status' in body) updatePayload.status = body.status;
  if ('scriptId' in body) updatePayload.script_id = body.scriptId;

  // 支持增量更新 expressions：{ index: number, url: string } 或完整数组
  if ('expressions' in body) {
    if (typeof body.expressions === 'object' && 'index' in body.expressions && 'url' in body.expressions) {
      // 增量更新：先查询当前数据
      const { data: current } = await client
        .from('characters')
        .select('expressions')
        .eq('id', id)
        .maybeSingle();
      const currentExpressions = (current?.expressions as string[]) || [];
      while (currentExpressions.length <= body.expressions.index) {
        currentExpressions.push("");
      }
      currentExpressions[body.expressions.index] = body.expressions.url;
      updatePayload.expressions = currentExpressions;
    } else {
      // 完整数组更新
      updatePayload.expressions = body.expressions;
    }
  }

  let data = null;
  let error = null;
  const res1 = await client
    .from('characters')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (res1.error) {
    // Fallback: remove new columns and retry
    const safePayload = { ...updatePayload };
    delete safePayload.consistency_anchor;
    delete safePayload.forbidden_features;
    const res2 = await client
      .from('characters')
      .update(safePayload)
      .eq('id', id)
      .select()
      .maybeSingle();
    data = res2.data;
    error = res2.error;
  } else {
    data = res1.data;
  }
  if (error) throw new Error(`更新角色失败: ${error.message}`);
  if (!data) {
    return NextResponse.json({ success: false, error: '角色不存在' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: toCamelCase(data) });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = getSupabaseClient();

  // 1. 查询角色关联的资产（通过 character_id）
  const { data: assets, error: assetsQueryError } = await client
    .from('assets')
    .select('id, url')
    .eq('character_id', id);

  if (assetsQueryError) {
    console.error('[Characters API] 查询关联资产失败:', assetsQueryError.message);
  }

  // 2. 删除云端存储文件和资产记录
  if (assets && assets.length > 0) {
    for (const asset of assets) {
      // 尝试删除云存储文件
      if (asset.url) {
        const deleteResult = await deleteStorageFile(asset.url as string);
        if (!deleteResult.success) {
          console.warn('[Characters API] 云存储文件删除失败:', deleteResult.error);
        }
      }
    }
    // 批量删除资产记录
    const { error: deleteAssetsError } = await client
      .from('assets')
      .delete()
      .eq('character_id', id);
    if (deleteAssetsError) {
      console.error('[Characters API] 删除关联资产失败:', deleteAssetsError.message);
    }
  }

  // 3. 删除角色记录
  const { error } = await client.from('characters').delete().eq('id', id);
  if (error) throw new Error(`删除角色失败: ${error.message}`);
  return NextResponse.json({ success: true });
}
