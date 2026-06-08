/**
 * 全局素材库 API
 * POST /api/ai/asset-library
 * 
 * 素材类型：
 * - 角色：参考图、表情包、服装
 * - 场景：背景、道具
 * - 风格：色彩、光影
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// 素材类型定义
interface Asset {
  id: string;
  type: 'character' | 'scene' | 'style' | 'prop';
  category: string;
  name: string;
  tags: string[];
  file_url: string;
  thumbnail_url?: string;
  metadata: {
    width?: number;
    height?: number;
    format?: string;
    embedding?: number[];
    character_id?: string;
    scene_id?: string;
  };
  created_at: string;
  updated_at: string;
}

// GET: 获取素材列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = getSupabaseClient();
    
    let query = supabase
      .from('assets')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('type', type);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,tags.cs.{${search}}`);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data as Asset[],
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Asset library GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}

// POST: 创建新素材
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      type,
      category,
      name,
      tags,
      file_url,
      thumbnail_url,
      metadata,
    } = body;

    if (!type || !name || !file_url) {
      return NextResponse.json(
        { error: 'Missing required fields: type, name, file_url' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('assets')
      .insert({
        type,
        category: category || 'default',
        name,
        tags: tags || [],
        file_url,
        thumbnail_url,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data as Asset,
    });
  } catch (error) {
    console.error('Asset library POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create asset' },
      { status: 500 }
    );
  }
}

// PUT: 更新素材
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from('assets')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data as Asset,
    });
  } catch (error) {
    console.error('Asset library PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update asset' },
      { status: 500 }
    );
  }
}

// DELETE: 删除素材
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Asset deleted successfully',
    });
  } catch (error) {
    console.error('Asset library DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete asset' },
      { status: 500 }
    );
  }
}
