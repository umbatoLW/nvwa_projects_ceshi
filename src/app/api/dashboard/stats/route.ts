import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET() {
  try {
    const client = getSupabaseClient();

    // 获取今天的日期范围
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // 获取昨天日期（用于计算变化）
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString();

    // 查询剧本 - 不限制user_id以支持绕过认证模式
    const scriptsQuery = client
      .from('scripts')
      .select('id, title, genre, storyboards, created_at, updated_at')
      .order('updated_at', { ascending: false });
    
    const { data: scriptsData, error: scriptsError } = await scriptsQuery;

    if (scriptsError) {
      console.error('Scripts query error:', scriptsError);
    }

    // 统计剧本数量
    const totalScripts = scriptsData?.length || 0;
    const todayScripts = scriptsData?.filter(s => s.created_at >= todayISO).length || 0;
    const yesterdayScripts = scriptsData?.filter(s => 
      s.created_at >= yesterdayISO && s.created_at < todayISO
    ).length || 0;

    // 统计分镜数量（从剧本的storyboards字段）
    let totalStoryboards = 0;
    let todayStoryboards = 0;
    scriptsData?.forEach(script => {
      const storyboards = script.storyboards;
      if (storyboards && Array.isArray(storyboards)) {
        totalStoryboards += storyboards.length;
        // 检查是否是今天创建的剧本
        if (script.created_at && script.created_at >= todayISO) {
          todayStoryboards += storyboards.length;
        }
      }
    });

    // 查询生成记录
    const generationsQuery = client
      .from('generations')
      .select('id, type, created_at, results')
      .order('created_at', { ascending: false });
    
    const { data: generationsData, error: generationsError } = await generationsQuery;

    if (generationsError) {
      console.error('Generations query error:', generationsError);
    }

    // 统计生成素材数量
    const totalGenerations = generationsData?.length || 0;
    const todayGenerations = generationsData?.filter(g => g.created_at >= todayISO).length || 0;
    
    // 统计实际生成的素材数量（图片、视频等）
    let totalAssets = 0;
    let todayAssets = 0;
    let yesterdayAssets = 0;
    generationsData?.forEach(gen => {
      const results = gen.results;
      if (results && Array.isArray(results)) {
        totalAssets += results.length;
        if (gen.created_at >= todayISO) {
          todayAssets += results.length;
        } else if (gen.created_at >= yesterdayISO && gen.created_at < todayISO) {
          yesterdayAssets += results.length;
        }
      }
    });

    // 统计近7天创作活跃度
    // 活跃度计算：创建剧本 + 更新剧本 + 生成素材
    const activityData: number[] = [];
    const dayLabels: string[] = [];
    
    // 使用本地时间进行日期比较
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      // 当天新建的剧本（created_at）- 使用本地日期比较
      const dayNewScripts = scriptsData?.filter(s => {
        const createdAt = new Date(s.created_at);
        return createdAt >= dayStart && createdAt <= dayEnd;
      }).length || 0;

      // 当天更新的剧本（updated_at，排除当天新建的）
      const dayUpdatedScripts = scriptsData?.filter(s => {
        const updatedAt = new Date(s.updated_at);
        const createdAt = new Date(s.created_at);
        return updatedAt >= dayStart && 
               updatedAt <= dayEnd &&
               createdAt < dayStart; // 排除当天新建的
      }).length || 0;

      // 当天生成的素材
      const dayGenerations = generationsData?.filter(g => {
        const createdAt = new Date(g.created_at);
        return createdAt >= dayStart && createdAt <= dayEnd;
      }).length || 0;

      // 活跃度 = 新建 + 更新 + 生成素材
      const dayActivity = dayNewScripts + dayUpdatedScripts + dayGenerations;
      activityData.push(dayActivity);
      
      // 生成日期标签：格式"5月16日"
      dayLabels.push(dayStart.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' }));
    }

    // 计算变化趋势
    const scriptChange = todayScripts - yesterdayScripts;
    const assetChange = todayAssets - yesterdayAssets;

    // 构建最近项目列表
    const recentProjects = (scriptsData || []).slice(0, 5).map(s => ({
      id: s.id,
      title: s.title || '未命名剧本',
      type: '剧本',
      updated: s.updated_at || s.created_at,
      genre: s.genre || '未知类型',
    }));

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          scripts: {
            total: totalScripts,
            today: todayScripts,
            change: scriptChange >= 0 ? `+${scriptChange}` : `${scriptChange}`,
          },
          storyboards: {
            total: totalStoryboards,
            today: todayStoryboards,
            change: todayStoryboards > 0 ? `+${todayStoryboards}` : '0',
          },
          assets: {
            total: totalAssets > 0 ? totalAssets : totalGenerations,
            today: todayAssets > 0 ? todayAssets : todayGenerations,
            change: assetChange >= 0 ? `+${assetChange}` : `${assetChange}`,
          },
        },
        activity: {
          data: activityData,
          labels: dayLabels,
        },
        recentProjects,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { success: false, error: '获取统计数据失败' },
      { status: 500 }
    );
  }
}
