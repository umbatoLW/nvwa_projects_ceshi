# 阿里云百炼模型参数表 - Nvwa平台

## 一、LLM 大语言模型

### 1.1 API格式（所有厂商统一）
```typescript
// 端点: POST /v1/chat/completions
// Base URL: https://dashscope.aliyuncs.com/compatible-mode/v1
// 认证: Bearer {API_KEY}

{
  model: "qwen-plus",           // 动态切换模型
  messages: [
    { role: "system", content: "..." },
    { role: "user", content: "..." }
  ],
  stream: true/false,           // 流式输出
  max_tokens: 2000,              // 可选
  temperature: 0.7               // 可选
}
```

### 1.2 推荐模型清单

| 模型 | 模型ID | 特点 | 适用场景 |
|------|--------|------|----------|
| **通义旗舰** | `qwen-max` | 最强效果 | 高质量内容生成 |
| **通义均衡** | `qwen-plus` | 性价比高 | 日常对话、创作 |
| **通义快速** | `qwen-turbo` | 极速响应 | 快速问答 |
| **DeepSeek旗舰** | `deepseek-v3` | 推理能力强 | 复杂推理 |
| **DeepSeek推理** | `deepseek-r1` | 深度思考 | 数学/代码 |
| **Kimi旗舰** | `kimi-k2.5` | 长上下文 | 长文本处理 |
| **GLM旗舰** | `glm-5` | 综合能力 | 通用场景 |
| **MiniMax旗舰** | `MiniMax-M2.5` | 编码能力强 | 编程任务 |

---

## 二、生图模型

### 2.1 通义生图 2.0 (qwen-image-2.0-pro) ⭐ 推荐

```typescript
// 端点: POST /v1/services/aigc/text2image/image-generation
// 注意：使用 messages 格式（不是 prompt）

{
  model: "qwen-image-2.0-pro",
  input: {
    messages: [
      {
        role: "user",
        content: [
          { text: "一只可爱的橘黄色猫，阳光下打盹" }
        ]
      }
    ]
  },
  parameters: {
    size: "2048*2048",           // 尺寸
    n: 1,                         // 生成数量
    watermark: false,             // 水印
    seed: -1                      // 随机种子
  }
}

// 响应: { output: { task_id, task_status } }
```

### 2.2 万相生图 (wan2.7-image-pro)

```typescript
// 端点: POST /v1/images/generations

{
  model: "wan2.7-image-pro",
  input: { prompt: "..." },
  parameters: {
    size: "1024*1024" | "768*1344" | "1344*768" | "1024*2048" | "2048*1024",
    n: 1,
    watermark: false
  }
}
```

### 2.3 可灵生图 (kling-image-generation)

```typescript
{
  model: "kling/kling-v3-image-generation",
  input: { prompt: "..." },
  parameters: {
    size: "?, ?",                // 具体尺寸
    n: 1,
    watermark: false
  }
}
```

### 2.4 生图模型参数对比

| 模型 | API格式 | 尺寸选项 | 提示词格式 |
|------|---------|----------|------------|
| **qwen-image-2.0-pro** ⭐ | 阿里专有 | 2048*2048 | messages |
| **wan2.7-image-pro** | OpenAI | 1024/768/1K | prompt |
| **wan2.6-image** | OpenAI | 512/768/1024/1K | prompt |
| **kling-v3-image** | 阿里专有 | 多种尺寸 | prompt |

### 2.5 生图模型清单

| 模型 | 模型ID | 特点 |
|------|--------|------|
| **通义生图Pro** ⭐ | `qwen-image-2.0-pro` | 文字渲染强、质量高 |
| **通义生图** | `qwen-image-2.0` | 标准版 |
| **万相2.7 Pro** | `wan2.7-image-pro` | 高质量 |
| **万相2.7** | `wan2.7-image` | 标准版 |
| **万相2.6** | `wan2.6-image` | 快速版 |
| **可灵生图** | `kling/kling-v3-image-generation` | 配套可灵视频 |

---

## 三、视频生成模型 ⭐ 重点

### 3.1 统一API格式

```typescript
// 端点: POST /v1/services/aigc/video-generation/video-synthesis
// Header: X-DashScope-Async: enable

{
  model: "vidu/viduq3-pro_text2video",
  input: {
    prompt: "...",
    // 或图生视频:
    // image_url: "https://..."
    // 或首尾帧:
    // first_image_url: "...",
    // last_image_url: "..."
    // 或参考视频:
    // ref_video_url: "...",
    // ref_image_url: "..."
  },
  parameters: {
    duration: 5,                  // 时长(秒)
    resolution: "720P",           // 分辨率
    size: "1280*720",             // 尺寸 (宽*高)
    aspect_ratio: "16:9",         // 宽高比
    watermark: false,             // 水印
    audio: false                  // 音频(部分模型支持)
  }
}

// 响应: { output: { task_id, task_status } }
```

### 3.2 快乐马 (Happy Horse) ⭐ 阿里自研

| 类型 | 模型ID | 时长 | 尺寸选项 | API |
|------|--------|------|----------|-----|
| **文生视频** | `happyhorse-1.0-t2v` | **5秒** | 16:9, 9:16, 1:1 | video-synthesis |
| **图生视频** | `happyhorse-1.0-i2v` | **5秒** | 16:9, 9:16, 1:1 | video-synthesis |
| **参考视频** | `happyhorse-1.0-r2v` | **5秒** | 16:9, 9:16, 1:1 | video-synthesis |
| **视频编辑** | `happyhorse-1.0-video-edit` | **13秒** | 支持编辑 | video-synthesis |

```typescript
// 快乐马参数示例
{
  model: "happyhorse-1.0-t2v",
  input: { prompt: "..." },
  parameters: {
    duration: 5,
    size: "1280*720",
    aspect_ratio: "16:9",
    watermark: true
  }
}
```

### 3.3 万相视频 (WanX)

| 类型 | 模型ID | 时长 | 尺寸 | API |
|------|--------|------|------|-----|
| **文生视频** | `wan2.7-t2v` | **15秒** | 多种 | video-synthesis |
| **图生视频** | `wan2.7-i2v` | **15秒** | 多种 | video-synthesis |
| **参考视频** | `wan2.7-r2v` | **15秒** | 多种 | video-synthesis |
| **视频转视频** | `wan-video-to-video` | **15秒** | 多种 | video-synthesis |
| **视频编辑** | `wan-video-editing` | **15秒** | 多种 | video-synthesis |
| **动漫混合** | `wan-animate-mix` | - | - | video-synthesis |

### 3.4 即梦 (Jimeng)

| 类型 | 模型ID | 时长 | 尺寸 | API |
|------|--------|------|------|-----|
| **文/图生视频** | `jimeng-videos` | **5s/10s/15s** | 720P/1080P | video-synthesis |
| **文/图生视频** | `jimeng-videos-3.0` | **待确认** | 多种 | video-synthesis |
| **通用图生视频** | `image-to-video-general` | **5-8秒** | 540P/720P/1080P | video-synthesis |

```typescript
// 即梦参数示例
{
  model: "jimeng-videos",
  input: { prompt: "..." },
  parameters: {
    duration: 5,                  // 5s, 10s, 15s
    resolution: "720P",           // 720P, 1080P
    watermark: true
  }
}
```

### 3.5 Vidu

| 类型 | 模型ID | 时长 | 分辨率 | API |
|------|--------|------|--------|-----|
| **文生视频 Pro** | `vidu/viduq3-pro_text2video` | **5-16秒** | 540P/720P/1080P | video-synthesis |
| **图生视频 Pro** | `vidu/viduq3-pro_img2video` | **5-16秒** | 540P/720P/1080P | video-synthesis |
| **文生视频 Turbo** | `vidu/viduq2-turbo_text2video` | **5秒** | 720P/1080P | video-synthesis |
| **图生视频 Pro** | `vidu/viduq2-pro_img2video` | **5-7秒** | 720P/1080P | video-synthesis |
| **关键帧视频** | `vidu-keyframe-to-video` | **5-8秒** | 540P/720P/1080P | video-synthesis |
| **参考视频** | `vidu-reference-to-video` | **5-8秒** | 540P/720P/1080P | video-synthesis |

```typescript
// Vidu参数示例
{
  model: "vidu/viduq3-pro_text2video",
  input: { prompt: "..." },
  parameters: {
    duration: 5,                  // 5-16秒
    resolution: "720P",           // 540P, 720P, 1080P
    size: "1280*720",              // 具体尺寸
    watermark: true
  }
}
```

### 3.6 可灵 (Kling)

| 类型 | 模型ID | 时长 | 尺寸 | API |
|------|--------|------|------|-----|
| **V3全能视频** ⭐ | `kling/kling-v3-omni-video-generation` | **5秒/10秒** | 多种 | video-synthesis |
| **V3文生视频** | `kling/kling-v3-video-generation` | **5秒** | 多种 | video-synthesis |
| **V3图生视频** | `kling/kling-v3-video-generation` | **5秒** | 多种 | video-synthesis |
| **V3首尾帧** | `kling/kling-v3-video-generation` | **5秒** | 多种 | video-synthesis |
| **V3参考视频** | `kling/kling-v3-omni-video-generation` | - | 多种 | video-synthesis |

```typescript
// 可灵V3参数示例 (智能分镜模式)
{
  model: "kling/kling-v3-omni-video-generation",
  input: {
    prompt: "场景1描述|场景2描述|场景3描述",  // 竖线分隔多段
    media: [],                                  // 媒体素材
    element_list: []                            // 元素列表
  },
  parameters: {
    duration: 10,              // 智能分镜模式可设置10秒
    audio: true,               // 是否生成音频
    aspect_ratio: "9:16",      // 9:16, 16:9, 1:1
    watermark: true
  }
}

// 可灵V3普通模式
{
  model: "kling/kling-v3-video-generation",
  input: { prompt: "..." },
  parameters: {
    duration: 5,
    watermark: true
  }
}
```

### 3.7 视频模型时长汇总

| 模型 | 文生视频 | 图生视频 | 首尾帧 | 参考视频 | 视频编辑 |
|------|---------|---------|--------|---------|---------|
| **快乐马** | 5s | 5s | - | 5s | 13s |
| **万相2.7** | 15s | 15s | - | 15s | 15s |
| **即梦** | 5/10/15s | 5/10/15s | - | - | - |
| **Vidu Q3 Pro** | 5-16s | 5-16s | - | 5-8s | - |
| **Vidu Q2** | 5s | 5-7s | - | 5-8s | - |
| **可灵V3 Omni** | 5/10s | 5s | 5s | 支持 | - |
| **可灵V3** | 5s | 5s | 5s | - | - |

### 3.8 视频模型尺寸汇总

| 模型 | 尺寸选项 | 分辨率选项 |
|------|----------|-----------|
| **快乐马** | 16:9, 9:16, 1:1 | - |
| **万相2.7** | 多种 | - |
| **即梦** | - | 720P, 1080P |
| **Vidu** | 宽*高 | 540P, 720P, 1080P |
| **可灵** | aspect_ratio | - |

---

## 四、3D生成模型 ⭐ 新增

### 4.1 API格式

```typescript
// 端点: POST /v1/services/aigc/video-generation/3d-generation
// Header: X-DashScope-Async: enable

{
  model: "Tripo/Tripo-H3.1",
  input: {
    // 文生3D
    prompt: "一只可爱的猫"
    // 或单图生3D
    // image: "https://..."
    // 或多视角生3D
    // images: ["url1", "url2", "url3", "url4"]
  },
  parameters: {
    texture_quality: "standard" | "high",  // 纹理质量
    texture: true,                          // 是否输出纹理
    pbr: true                               // 是否输出PBR材质
  }
}

// 响应
{
  output: {
    task_status: "SUCCEEDED",
    results: [{
      pbr_model_url: "xxx.glb",           // 3D模型文件
      rendered_image_url: "xxx.webp"      // 渲染预览图
    }]
  }
}
```

### 4.2 3D模型清单

| 模型 | 模型ID | 特点 | 输入模式 |
|------|--------|------|----------|
| **Tripo H3.1** ⭐ | `Tripo/Tripo-H3.1` | 高质量3D | 文/图/多视角 |
| **Tripo P1.0** | `Tripo/Tripo-P1.0` | 基础版 | 文/图/多视角 |

### 4.3 3D输入模式

| 模式 | 输入参数 | 说明 |
|------|----------|------|
| **文生3D** | `prompt` | 文字描述生成3D |
| **单图生3D** | `image` | 单张图片生成3D |
| **多视角生3D** | `images[]` | 4张多视角图片生成3D |

---

## 五、任务查询API

### 5.1 查询任务状态

```typescript
// 端点: GET /v1/tasks/{task_id}

curl -X GET "https://dashscope.aliyuncs.com/api/v1/tasks/{task_id}" \
  -H "Authorization: Bearer $DASHSCOPE_API_KEY"

// 响应
{
  output: {
    task_status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED",
    task_id: "xxx",
    // 成功后返回结果
    results: [...]
  },
  request_id: "xxx"
}
```

### 5.2 任务状态说明

| 状态 | 说明 |
|------|------|
| `PENDING` | 等待中 |
| `RUNNING` | 生成中 |
| `SUCCEEDED` | 成功完成 |
| `FAILED` | 生成失败 |

---

## 六、API Base URL 配置

```typescript
// 开发/生产环境统一配置
const BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

// OpenAI兼容接口
const API_KEY = process.env.DASHSCOPE_API_KEY;  // 阿里云百炼API Key
```

---

## 七、前端UI设计要点

### 7.1 模型选择器

```typescript
// 模型分类配置
const MODEL_CATEGORIES = {
  llm: {
    flagship: ['qwen-max', 'qwen-plus'],
    fast: ['qwen-turbo'],
    vision: ['qwen-vl-max'],
    reasoning: ['qvq-plus', 'kimi-k2.5']
  },
  image: {
    quality: ['qwen-image-2.0-pro', 'wan2.7-image-pro'],
    standard: ['qwen-image-2.0', 'wan2.7-image']
  },
  video: {
    // 按功能分组
    text2video: ['happyhorse-1.0-t2v', 'wan2.7-t2v', 'jimeng-videos', 'vidu/viduq3-pro_text2video', 'kling/kling-v3-video-generation'],
    image2video: ['happyhorse-1.0-i2v', 'wan2.7-i2v', 'vidu/viduq3-pro_img2video', 'kling/kling-v3-video-generation'],
    ref2video: ['happyhorse-1.0-r2v', 'wan2.7-r2v', 'vidu-reference-to-video'],
    videoEdit: ['happyhorse-1.0-video-edit', 'wan-video-editing']
  },
  threed: {
    text3d: ['Tripo/Tripo-H3.1', 'Tripo/Tripo-P1.0'],
    image3d: ['Tripo/Tripo-H3.1', 'Tripo/Tripo-P1.0']
  }
};
```

### 7.2 视频参数动态配置

```typescript
// 根据模型动态显示参数选项
const VIDEO_PARAMS = {
  'happyhorse-1.0-t2v': {
    duration: [5],
    aspect_ratio: ['16:9', '9:16', '1:1']
  },
  'jimeng-videos': {
    duration: [5, 10, 15],
    resolution: ['720P', '1080P']
  },
  'vidu/viduq3-pro_text2video': {
    duration: [5, 6, 7, 8, 10, 12, 16],
    resolution: ['540P', '720P', '1080P']
  },
  'kling/kling-v3-video-generation': {
    duration: [5],
    aspect_ratio: ['9:16', '16:9', '1:1']
  },
  'kling/kling-v3-omni-video-generation': {
    duration: [5, 10],
    aspect_ratio: ['9:16', '16:9', '1:1'],
    audio: [true, false]
  }
};
```

### 7.3 生图参数动态配置

```typescript
const IMAGE_PARAMS = {
  'qwen-image-2.0-pro': {
    size: ['2048*2048'],
    watermark: [true, false]
  },
  'wan2.7-image-pro': {
    size: ['1024*1024', '768*1344', '1344*768', '1024*2048', '2048*1024'],
    n: [1, 2, 4]
  }
};
```

---

## 八、Nvwa平台推荐集成清单

### 精简版（推荐优先）

| 类型 | 模型 | 模型ID | 优先级 |
|------|------|--------|--------|
| **LLM** | 通义Plus | `qwen-plus` | P0 |
| **LLM** | 通义Max | `qwen-max` | P0 |
| **LLM** | DeepSeek V3 | `deepseek-v3` | P1 |
| **LLM** | Kimi K2.5 | `kimi-k2.5` | P1 |
| **生图** | 通义生图2.0Pro | `qwen-image-2.0-pro` | P0 |
| **生图** | 万相2.7 Pro | `wan2.7-image-pro` | P1 |
| **视频** | 快乐马1.0 | `happyhorse-1.0-t2v` | P0 |
| **视频** | 可灵V3 | `kling/kling-v3-video-generation` | P0 |
| **视频** | Vidu Q3 Pro | `vidu/viduq3-pro_text2video` | P1 |
| **视频** | 即梦视频 | `jimeng-videos` | P1 |
| **3D** | Tripo H3.1 | `Tripo/Tripo-H3.1` | P0 |

### 完整版（按需扩展）

| 类型 | 模型 | 模型ID |
|------|------|--------|
| **LLM** | 通义Turbo | `qwen-turbo` |
| **LLM** | DeepSeek R1 | `deepseek-r1` |
| **LLM** | GLM-5 | `glm-5` |
| **LLM** | MiniMax M2.5 | `MiniMax-M2.5` |
| **LLM** | QwQ Plus | `qvq-plus` |
| **生图** | 万相2.6 | `wan2.6-image` |
| **生图** | 万相2.7 | `wan2.7-image` |
| **生图** | 可灵生图 | `kling/kling-v3-image-generation` |
| **视频** | 万相2.7视频 | `wan2.7-t2v` |
| **视频** | 即梦3.0 | `jimeng-videos-3.0` |
| **视频** | Vidu Q2 Turbo | `vidu/viduq2-turbo_text2video` |
| **视频** | 快乐马图生 | `happyhorse-1.0-i2v` |
| **视频** | 快乐马参考 | `happyhorse-1.0-r2v` |
| **视频** | 快乐马编辑 | `happyhorse-1.0-video-edit` |
| **3D** | Tripo P1.0 | `Tripo/Tripo-P1.0` |
