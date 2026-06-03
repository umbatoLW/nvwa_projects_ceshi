import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { getUserId } from '@/lib/server-auth';

// 用户设置类型
interface UserSettings {
  profile: {
    nickname: string;
    email: string;
    avatar: string;
    bio: string;
  };
  ai: {
    textModel: string;
    imageModel: string;
    videoModel: string;
    apiKey: string;
  };
  workflow: {
    defaultRatio: string;
    autoSaveInterval: number;
    exportFormat: string;
  };
  notifications: {
    taskComplete: boolean;
    contentReview: boolean;
    teamCollab: boolean;
    creditChange: boolean;
    productUpdates: boolean;
    emailNotify: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    sessions: Array<{ id: string; device: string; lastActive: string; current: boolean }>;
  };
}

// 默认设置
const defaultSettings: UserSettings = {
  profile: {
    nickname: '新用户',
    email: '',
    avatar: '',
    bio: '',
  },
  ai: {
    textModel: 'qwen-plus',
    imageModel: 'dall-e-3',
    videoModel: 'vidu-2',
    apiKey: '',
  },
  workflow: {
    defaultRatio: '16:9',
    autoSaveInterval: 3,
    exportFormat: 'mp4',
  },
  notifications: {
    taskComplete: true,
    contentReview: true,
    teamCollab: false,
    creditChange: true,
    productUpdates: false,
    emailNotify: false,
  },
  security: {
    twoFactorEnabled: false,
    sessions: [],
  },
};

function toCamelCase(settings: Record<string, unknown>): UserSettings {
  return {
    profile: {
      nickname: (settings.profile as Record<string, unknown>)?.nickname as string || defaultSettings.profile.nickname,
      email: (settings.profile as Record<string, unknown>)?.email as string || '',
      avatar: (settings.profile as Record<string, unknown>)?.avatar as string || '',
      bio: (settings.profile as Record<string, unknown>)?.bio as string || '',
    },
    ai: {
      textModel: (settings.ai as Record<string, unknown>)?.textModel as string || defaultSettings.ai.textModel,
      imageModel: (settings.ai as Record<string, unknown>)?.imageModel as string || defaultSettings.ai.imageModel,
      videoModel: (settings.ai as Record<string, unknown>)?.videoModel as string || defaultSettings.ai.videoModel,
      apiKey: (settings.ai as Record<string, unknown>)?.apiKey as string || '',
    },
    workflow: {
      defaultRatio: (settings.workflow as Record<string, unknown>)?.defaultRatio as string || defaultSettings.workflow.defaultRatio,
      autoSaveInterval: (settings.workflow as Record<string, unknown>)?.autoSaveInterval as number || defaultSettings.workflow.autoSaveInterval,
      exportFormat: (settings.workflow as Record<string, unknown>)?.exportFormat as string || defaultSettings.workflow.exportFormat,
    },
    notifications: (settings.notifications as UserSettings['notifications']) || defaultSettings.notifications,
    security: (settings.security as UserSettings['security']) || defaultSettings.security,
  };
}

// GET - 获取用户设置
export async function GET(request: NextRequest) {
  const userId = await getUserId(request);

  // 未登录用户返回默认设置
  if (!userId) {
    return NextResponse.json({ success: true, data: defaultSettings });
  }

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('user_settings')
      .select('settings')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && !error.message.includes('does not exist')) {
      console.error('获取设置失败:', error);
      // 返回默认设置而不是报错
      return NextResponse.json({ success: true, data: defaultSettings });
    }

    // 如果没有设置，返回默认设置
    if (!data) {
      return NextResponse.json({ success: true, data: defaultSettings });
    }

    return NextResponse.json({ success: true, data: toCamelCase(data.settings as Record<string, unknown>) });
  } catch (error) {
    console.error('获取设置异常:', error);
    // 出错时返回默认设置
    return NextResponse.json({ success: true, data: defaultSettings });
  }
}

// PUT - 更新用户设置
export async function PUT(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json(
      { success: false, error: '请先登录' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const client = getSupabaseClient();

    // 获取当前设置
    const { data: currentData } = await client
      .from('user_settings')
      .select('settings')
      .eq('user_id', userId)
      .maybeSingle();

    const currentSettings = currentData?.settings as Record<string, unknown> || defaultSettings;

    // 合并设置
    const updatedSettings = { ...currentSettings };

    if (body.profile) {
      updatedSettings.profile = { ...(currentSettings.profile as object), ...body.profile };
    }
    if (body.ai) {
      updatedSettings.ai = { ...(currentSettings.ai as object), ...body.ai };
    }
    if (body.workflow) {
      updatedSettings.workflow = { ...(currentSettings.workflow as object), ...body.workflow };
    }
    if (body.notifications) {
      updatedSettings.notifications = { ...(currentSettings.notifications as object), ...body.notifications };
    }
    if (body.security) {
      updatedSettings.security = { ...(currentSettings.security as object), ...body.security };
    }

    // 更新或创建设置
    const { error } = await client
      .from('user_settings')
      .upsert(
        { user_id: userId, settings: updatedSettings, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('保存设置失败:', error);
      return NextResponse.json({ success: false, error: '保存设置失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: toCamelCase(updatedSettings) });
  } catch (error) {
    console.error('保存设置异常:', error);
    return NextResponse.json({ success: false, error: '保存设置失败' }, { status: 500 });
  }
}
