import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { seedWorkflows } from '@/lib/store';

function toCamelCase(workflow: Record<string, unknown>) {
  return {
    id: workflow.id,
    name: workflow.name,
    nodes: workflow.nodes,
    edges: workflow.edges,
    status: workflow.status,
    createdAt: workflow.created_at,
    updatedAt: workflow.updated_at,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('workflows')
    .select('id, name, nodes, edges, status, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`查询工作流失败: ${error.message}`);
  if (data) {
    return NextResponse.json({ success: true, data: toCamelCase(data) });
  }
  const fallback = seedWorkflows.find((w) => w.id === id);
  if (fallback) {
    return NextResponse.json({ success: true, data: fallback });
  }
  return NextResponse.json({ success: false, error: '工作流不存在' }, { status: 404 });
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
  if ('nodes' in body) updatePayload.nodes = body.nodes;
  if ('edges' in body) updatePayload.edges = body.edges;
  if ('status' in body) updatePayload.status = body.status;
  updatePayload.updated_at = new Date().toISOString();

  const { data, error } = await client
    .from('workflows')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw new Error(`更新工作流失败: ${error.message}`);
  if (!data) {
    return NextResponse.json({ success: false, error: '工作流不存在' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: toCamelCase(data) });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const client = getSupabaseClient();
  const { error } = await client.from('workflows').delete().eq('id', id);
  if (error) throw new Error(`删除工作流失败: ${error.message}`);
  return NextResponse.json({ success: true });
}
