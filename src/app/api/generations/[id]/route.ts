import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = getSupabaseClient();
  const { error } = await client
    .from('generations')
    .delete()
    .eq('id', id);
  if (error) throw new Error(`删除创作历史失败: ${error.message}`);
  return NextResponse.json({ success: true });
}
