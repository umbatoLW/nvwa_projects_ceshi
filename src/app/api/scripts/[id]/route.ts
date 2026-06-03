import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

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
    // 添加服装、道具、场景数据
    costumes: script.costumes || {},
    props: script.props || {},
    extractedScenes: script.extracted_scenes || {},
    episodeCount: script.episode_count || 0,
    wordCount: script.word_count || 0,
    sceneCount: script.scene_count || 0,
    status: script.status,
    coverImage: script.cover_image || null,
    createdAt: script.created_at,
    updatedAt: script.updated_at,
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
  const res1 = await client
    .from('scripts')
    .select('id, title, genre, synopsis, content, scenes, characters, storyboards, roles, costumes, props, extracted_scenes, episode_count, word_count, scene_count, status, cover_image, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (res1.error) {
    const res2 = await client
      .from('scripts')
      .select('id, title, genre, synopsis, content, scenes, characters, status, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();
    data = res2.data;
    error = res2.error;
  } else {
    data = res1.data;
  }
  if (error) throw new Error(`查询剧本失败: ${error.message}`);
  if (!data) {
    return NextResponse.json({ success: false, error: '剧本不存在' }, { status: 404 });
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
  if ('title' in body) updatePayload.title = body.title;
  if ('genre' in body) updatePayload.genre = body.genre;
  if ('synopsis' in body) updatePayload.synopsis = body.synopsis;
  if ('content' in body) updatePayload.content = body.content;
  if ('scenes' in body) updatePayload.scenes = body.scenes;
  if ('characters' in body) updatePayload.characters = body.characters;
  if ('storyboards' in body) updatePayload.storyboards = body.storyboards;
  if ('roles' in body) updatePayload.roles = body.roles;
  // 添加服装、道具、场景数据的保存
  if ('costumes' in body) updatePayload.costumes = body.costumes;
  if ('props' in body) updatePayload.props = body.props;
  if ('extractedScenes' in body) updatePayload.extracted_scenes = body.extractedScenes;
  if ('episodeCount' in body) updatePayload.episode_count = body.episodeCount;
  if ('wordCount' in body) updatePayload.word_count = body.wordCount;
  if ('sceneCount' in body) updatePayload.scene_count = body.sceneCount;
  if ('status' in body) updatePayload.status = body.status;
  if ('coverImage' in body) updatePayload.cover_image = body.coverImage;
  updatePayload.updated_at = new Date().toISOString();

  let data = null;
  let error = null;
  const res1 = await client
    .from('scripts')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (res1.error) {
    const safePayload = { ...updatePayload };
    delete safePayload.storyboards;
    delete safePayload.roles;
    delete safePayload.costumes;
    delete safePayload.props;
    delete safePayload.extracted_scenes;
    delete safePayload.episode_count;
    const res2 = await client
      .from('scripts')
      .update(safePayload)
      .eq('id', id)
      .select()
      .maybeSingle();
    data = res2.data;
    error = res2.error;
  } else {
    data = res1.data;
  }
  if (error) throw new Error(`更新剧本失败: ${error.message}`);
  if (!data) {
    return NextResponse.json({ success: false, error: '剧本不存在' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: toCamelCase(data) });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = getSupabaseClient();
  const { error } = await client.from('scripts').delete().eq('id', id);
  if (error) throw new Error(`删除剧本失败: ${error.message}`);
  return NextResponse.json({ success: true });
}
