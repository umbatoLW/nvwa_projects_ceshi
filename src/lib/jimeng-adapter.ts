/**
 * 即梦 (Jimeng/SeedDream) 文生图适配器
 * 支持 Seedream 3.0 文生图模型
 */

import { createVolcengineSigner, VolcengineSigner, VOLCENGINE_CONFIG } from './volcengine-sign';
import { getPlatformConfig } from './platform-keys';

// 即梦 API 配置
export const JIMENG_CONFIG = {
  version: '2022-08-31',
  // Seedream 模型配置
  models: {
    'seedream-3.0-t2i': {
      reqKey: 'high_aes_general_v30l_zt2i',
      name: 'Seedream 3.0 文生图',
      category: 'image',
      defaultWidth: 1328,
      defaultHeight: 1328,
      maxWidth: 2048,
      maxHeight: 2048,
    },
    'seedream-4.6-t2i': {
      reqKey: 'jimeng_seedream46_cvtob',
      name: 'Seedream 4.6 文生图',
      category: 'image',
      defaultWidth: 2048,
      defaultHeight: 2048,
      maxWidth: 4096,
      maxHeight: 4096,
      forceSingle: false, // 不强制单图，允许生成多张
    },
    // 可扩展其他模型
    'seedream-3.0-i2i': {
      reqKey: 'high_aes_general_v30l_i2i',
      name: 'Seedream 3.0 图生图',
      category: 'image',
      defaultWidth: 1328,
      defaultHeight: 1328,
      maxWidth: 2048,
      maxHeight: 2048,
    },
  },
};

// 即梦 API 响应类型
interface JimengSubmitResponse {
  code: number;
  data?: {
    task_id: string;
  };
  message: string;
  request_id: string;
  time_elapsed: string;
}

interface JimengQueryResponse {
  code: number;
  data?: {
    task_id: string;
    status: string;
    image_url?: string;
    imageUrl?: string;
    images?: Array<{ image_url?: string; imageUrl?: string } | string>;
    binary_data_base64?: string[];
  };
  message: string;
  request_id: string;
}

// 生成参数类型
export interface JimengGenerateParams {
  prompt: string;
  model?: string;
  width?: number;
  height?: number;
  seed?: number;
  scale?: number;
  usePreLlm?: boolean;
}

// 生成结果类型
export interface JimengGenerateResult {
  success: boolean;
  taskId?: string;
  imageUrl?: string;
  imageUrls?: string[];
  status?: 'pending' | 'processing' | 'running' | 'succeeded' | 'failed' | 'PENDING' | 'PROCESSING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  progress?: number;
  error?: string;
}

/**
 * 即梦文生图客户端
 */
export class JimengImageClient {
  private signer: VolcengineSigner;

  constructor(accessKeyId: string, secretAccessKey: string) {
    this.signer = createVolcengineSigner(accessKeyId, secretAccessKey);
  }

  /**
   * 提交文生图任务
   */
  async submitTask(params: JimengGenerateParams): Promise<JimengGenerateResult> {
    const model = params.model || 'seedream-3.0-t2i';
    const modelConfig = JIMENG_CONFIG.models[model as keyof typeof JIMENG_CONFIG.models];

    if (!modelConfig) {
      return { success: false, error: `不支持的模型: ${model}` };
    }

    const body: Record<string, unknown> = {
      req_key: modelConfig.reqKey,
      prompt: params.prompt,
      width: params.width || modelConfig.defaultWidth,
      height: params.height || modelConfig.defaultHeight,
    };

    // 可选参数
    if (params.seed !== undefined) {
      body.seed = params.seed;
    } else {
      body.seed = -1; // 随机种子
    }

    if (params.scale !== undefined) {
      body.scale = Math.max(1, Math.min(10, params.scale));
    }

    if (params.usePreLlm !== undefined) {
      body.use_pre_llm = params.usePreLlm;
    }

    try {
      const response = await this.signer.request(
        'POST',
        'CVSync2AsyncSubmitTask',
        JIMENG_CONFIG.version,
        body
      );

      const result = response.body as unknown as JimengSubmitResponse;

      if (result.code !== undefined && result.code !== 10000) {
        return {
          success: false,
          error: result.message || `提交任务失败: code ${result.code}`,
        };
      }

      if (!result.data?.task_id) {
        return { success: false, error: '未返回任务ID' };
      }

      return {
        success: true,
        taskId: result.data.task_id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '提交任务异常',
      };
    }
  }

  /**
   * 查询任务结果
   */
  async queryTask(taskId: string, model: string = 'seedream-3.0-t2i'): Promise<JimengGenerateResult> {
    const modelConfig = JIMENG_CONFIG.models[model as keyof typeof JIMENG_CONFIG.models];

    if (!modelConfig) {
      return { success: false, error: `不支持的模型: ${model}` };
    }

    const body: Record<string, unknown> = {
      req_key: modelConfig.reqKey,
      task_id: taskId,
      req_json: JSON.stringify({ return_url: true }),
    };

    try {
      const response = await this.signer.request(
        'POST',
        'CVSync2AsyncGetResult',
        JIMENG_CONFIG.version,
        body
      );

      const result = response.body as unknown as JimengQueryResponse;
      
      // 调试日志：查看完整返回结果
      console.log('[即梦任务查询] taskId:', taskId);
      console.log('[即梦任务查询] result.code:', result.code);
      console.log('[即梦任务查询] result.data:', JSON.stringify(result.data, null, 2).substring(0, 1000));

      if (result.code !== 10000) {
        return {
          success: false,
          error: result.message || `查询任务失败: code ${result.code}`,
        };
      }

      if (!result.data) {
        return { success: false, error: '未返回任务数据' };
      }

      // 检查任务状态
      const status = result.data.status?.toLowerCase();
      console.log('[即梦任务查询] status:', status);
      
      if (status === 'running' || status === 'pending' || status === 'processing') {
        return {
          success: true,
          taskId: taskId,
          status: 'RUNNING',
          progress: 50,
        };
      }

      if (status === 'failed' || status === 'error') {
        return { success: false, error: '任务执行失败', status: 'FAILED' };
      }

      // 对于 DONE 或 SUCCEEDED 或未知状态，都尝试获取图片
      // 即梦API可能返回 DONE、SUCCEEDED 或者直接不返回status字段
      // 如果状态不是 RUNNING/PENDING/FAILED/ERROR，则尝试提取图片

      // 获取图片URL - 多种可能的字段格式
      let imageUrl = result.data.image_url || result.data.imageUrl;
      const imageUrls: string[] = [];
      if (imageUrl) {
        imageUrls.push(imageUrl);
      }
      // 检查 images 数组
      if (result.data.images && result.data.images.length > 0) {
        for (const img of result.data.images) {
          if (typeof img === 'string') {
            imageUrls.push(img);
          } else if (img.image_url) {
            imageUrls.push(img.image_url);
          } else if (img.imageUrl) {
            imageUrls.push(img.imageUrl);
          }
        }
      }
      // 检查 binary_data_base64（即梦可能返回base64数据）
      if (result.data.binary_data_base64 && result.data.binary_data_base64.length > 0) {
        for (const base64 of result.data.binary_data_base64) {
          if (base64) {
            imageUrls.push(`data:image/png;base64,${base64}`);
          }
        }
      }

      console.log('[即梦任务查询] imageUrls:', imageUrls);

      if (imageUrls.length === 0) {
        return { success: false, error: '未返回图片URL', status: 'FAILED' };
      }

      return {
        success: true,
        taskId: taskId,
        status: 'SUCCEEDED',
        progress: 100,
        imageUrl: imageUrls[0],
        imageUrls: imageUrls,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '查询任务异常',
      };
    }
  }

  /**
   * 完整生成流程（提交 + 轮询）
   */
  async generate(
    params: JimengGenerateParams,
    maxRetries: number = 30,
    pollInterval: number = 2000
  ): Promise<JimengGenerateResult> {
    // 1. 提交任务
    const submitResult = await this.submitTask(params);
    
    if (!submitResult.success || !submitResult.taskId) {
      return submitResult;
    }

    const taskId = submitResult.taskId;
    const model = params.model || 'seedream-3.0-t2i';

    // 2. 轮询查询结果
    for (let i = 0; i < maxRetries; i++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const queryResult = await this.queryTask(taskId, model);

      if (!queryResult.success) {
        return queryResult;
      }

      if (queryResult.imageUrl) {
        return queryResult;
      }

      // 继续轮询
    }

    return {
      success: false,
      error: '生成超时，请稍后查询',
      taskId: taskId,
    };
  }
}

/**
 * 创建即梦客户端实例
 */
export function createJimengClient(
  accessKeyId: string,
  secretAccessKey: string
): JimengImageClient {
  return new JimengImageClient(accessKeyId, secretAccessKey);
}

/**
 * 即梦文生图便捷函数
 * 与阿里云API返回格式保持一致
 * 支持批量出图：count > 1 时循环提交多个任务
 */
export async function generateImageWithJimeng(
  prompt: string,
  options: {
    model?: string;
    width?: number;
    height?: number;
    seed?: number;
    count?: number; // 出图数量，默认1
    accessKeyId: string;
    secretAccessKey: string;
  }
): Promise<{ taskId?: string; taskIds?: string[]; imageUrls?: string[]; error?: string }> {
  const client = createJimengClient(options.accessKeyId, options.secretAccessKey);
  const count = options.count || 1;
  const taskIds: string[] = [];
  
  // 批量提交任务（即梦API单次只出1张，需要多次调用）
  for (let i = 0; i < count; i++) {
    const result = await client.submitTask({
      prompt,
      model: options.model || 'seedream-3.0-t2i',
      width: options.width,
      height: options.height,
      seed: options.seed, // 使用相同seed或让每次随机
    });
    
    if (!result.success) {
      // 如果已经有部分任务提交成功，继续处理已提交的
      if (taskIds.length > 0) {
        console.warn(`[Jimeng] 部分任务提交失败，已提交 ${taskIds.length}/${count} 个任务`);
        break;
      }
      throw new Error(result.error || '提交任务失败');
    }
    
    if (result.taskId) {
      taskIds.push(result.taskId);
    }
  }
  
  // 返回taskIds数组
  if (taskIds.length === 1) {
    return { taskId: taskIds[0] };
  }
  return { taskIds };
}

/**
 * 查询即梦任务状态
 */
export async function queryJimengTask(taskId: string, model: string = 'seedream-3.0-t2i'): Promise<{
  success: boolean;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  progress: number;
  imageUrls?: string[];
  error?: string;
}> {
  // 获取模型配置
  const modelConfig = JIMENG_CONFIG.models[model as keyof typeof JIMENG_CONFIG.models];
  const reqKey = modelConfig?.reqKey || 'high_aes_general_v30l_zt2i';
  
  // 获取即梦平台配置
  const config = await getPlatformConfig('jimeng');
  
  if (!config || !config.apiKey || !config.secretKey) {
    return {
      success: false,
      status: 'FAILED',
      progress: 0,
      error: '即梦 API Key 未配置',
    };
  }
  
  const apiKey = config.apiKey;
  const secretKey = config.secretKey;

  const signer = createVolcengineSigner(apiKey, secretKey);
  
  // 查询任务结果
  const response = await signer.request(
    'POST',
    'CVSync2AsyncGetResult',
    '2022-08-31',
    {
      req_key: reqKey,
      task_id: taskId,
    }
  );

  if (response.statusCode !== 200) {
    const body = response.body as Record<string, unknown>;
    const metadata = body?.ResponseMetadata as Record<string, unknown> | undefined;
    const errorInfo = metadata?.Error as Record<string, unknown> | undefined;
    return {
      success: false,
      status: 'FAILED',
      progress: 0,
      error: (errorInfo?.Message as string) || '查询任务失败',
    };
  }

  const body = response.body as Record<string, unknown>;
  const code = body.code as number;
  
  if (code !== 10000) {
    return {
      success: false,
      status: 'FAILED',
      progress: 0,
      error: (body.message as string) || '查询任务失败',
    };
  }

  const data = body.data as Record<string, unknown> | undefined;
  const status = data?.status as string;
  
  // 映射状态（注意：火山引擎返回的是小写状态）
  let taskStatus: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  const statusLower = status?.toLowerCase();
  switch (statusLower) {
    case 'running':
    case 'in_progress':
      taskStatus = 'RUNNING';
      break;
    case 'success':
    case 'done':
      taskStatus = 'SUCCESS';
      break;
    case 'failed':
    case 'error':
      taskStatus = 'FAILED';
      break;
    default:
      taskStatus = 'PENDING';
  }

  // 提取图片URL或base64数据
  const imageUrls: string[] = [];
  if (taskStatus === 'SUCCESS' && data) {
    // 火山引擎返回格式：data.binary_data_base64 是 base64 编码的图片数组
    const binaryDataBase64 = data.binary_data_base64 as string[] | undefined;
    if (binaryDataBase64 && Array.isArray(binaryDataBase64)) {
      // 将 base64 数据转换为 data URL
      for (const base64Data of binaryDataBase64) {
        if (base64Data) {
          // 检查是否已经是完整的数据URL，否则添加前缀
          if (base64Data.startsWith('data:')) {
            imageUrls.push(base64Data);
          } else {
            imageUrls.push(`data:image/png;base64,${base64Data}`);
          }
        }
      }
    }
    
    // 也支持 image_urls 格式（如果有的话）
    const imageUrlsField = data.image_urls as string[] | undefined;
    if (imageUrlsField && Array.isArray(imageUrlsField)) {
      for (const url of imageUrlsField) {
        if (url && !imageUrls.includes(url)) {
          imageUrls.push(url);
        }
      }
    }
    
    // 兼容其他可能的格式
    const imageList = data.image_list as Array<{ image_url?: string }> | undefined;
    if (imageList && Array.isArray(imageList)) {
      for (const img of imageList) {
        if (img.image_url && !imageUrls.includes(img.image_url)) {
          imageUrls.push(img.image_url);
        }
      }
    }
    
    const images = data.images as string[] | undefined;
    if (images && Array.isArray(images)) {
      for (const img of images) {
        if (img && !imageUrls.includes(img)) {
          imageUrls.push(img);
        }
      }
    }
    
    const url = data.url as string | undefined;
    if (url && !imageUrls.includes(url)) {
      imageUrls.push(url);
    }
  }

  return {
    success: taskStatus === 'SUCCESS',
    status: taskStatus,
    progress: taskStatus === 'SUCCESS' ? 100 : 50,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    error: taskStatus === 'FAILED' ? '生成失败' : undefined,
  };
}
