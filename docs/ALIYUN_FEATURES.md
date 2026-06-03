# 阿里云百炼 - Nvwa平台可集成功能全景清单

## 一、已确认核心功能

### 1.1 LLM 大语言模型
| 功能 | 模型 | API格式 | 优先级 |
|------|------|---------|--------|
| 文本生成 | qwen-plus/max/turbo | OpenAI标准 | P0 |
| 深度推理 | deepseek-v3/r1 | OpenAI标准 | P1 |
| 多模态对话 | qwen-vl-max | OpenAI标准(支持图片) | P1 |
| 视觉推理 | qvq-plus | OpenAI标准 | P2 |
| 第三方LLM | kimi-k2.5, glm-5, minimax | OpenAI标准 | P2 |

---

## 二、图像生成与编辑 (大幅扩展)

### 2.1 基础生图 (已有)
| 功能 | 模型 | API端点 | 优先级 |
|------|------|---------|--------|
| 文生图 | qwen-image-2.0-pro | /services/aigc/text2image | P0 |
| 文生图 | wan2.7-image-pro | /v1/images/generations | P0 |
| 参考图生图 | qwen-image-2.0-pro | /services/aigc/text2image | P0 |

### 2.2 图像编辑 (新增)
| 功能 | 说明 | 模型 | API端点 | 优先级 |
|------|------|------|---------|--------|
| **图像编辑** | 根据指令编辑图像(替换/修改/删除元素) | qwen-image-edit | /services/aigc/text2image | P1 |
| **局部重绘** | 涂抹区域后重新生成内容 | vary-region | /services/aigc/text2image | P1 |
| **图像擦除** | 涂抹区域后智能补全背景 | image-erase-completion | /services/aigc/text2image | P1 |
| **图像超分** | 放大图像并保持清晰度 | image-scaling | /services/aigc/text2image | P2 |
| **背景生成** | 根据描述生成产品/场景背景 | wanx-background-generation | /services/aigc/background-gen | P2 |

### 2.3 图像翻译与风格 (新增)
| 功能 | 说明 | 模型 | API端点 | 优先级 |
|------|------|------|---------|--------|
| **图像翻译** | 翻译图片中的文字(保留排版) | qwen-mt-image | /services/aigc/text2image | P2 |
| **肖像风格重绘** | 将真人照片转为动漫/素描等风格 | portrait-style-redraw | /services/aigc/text2image | P2 |
| **风格迁移** | 将图像风格转换为指定参考图风格 | wan-s2v(图像版) | /services/aigc/style-transfer | P2 |

---

## 三、视频生成 (已有 + 大幅扩展)

### 3.1 基础视频生成 (已有)
| 功能 | 模型 | 时长 | 尺寸 | 优先级 |
|------|------|------|------|--------|
| 文生视频 | happyhorse-1.0-t2v | 5s | 16:9/9:16/1:1 | P0 |
| 图生视频 | happyhorse-1.0-i2v | 5s | 16:9/9:16/1:1 | P0 |
| 参考视频 | happyhorse-1.0-r2v | 5s | 16:9/9:16/1:1 | P0 |
| 文生视频 | kling-v3 | 5s | 9:16/16:9/1:1 | P0 |
| 文生视频 | vidu-q3-pro | 5-16s | 540P/720P/1080P | P1 |
| 图生视频 | vidu-q3-pro | 5-16s | 540P/720P/1080P | P1 |
| 文/图生视频 | jimeng-videos | 5/10/15s | 720P/1080P | P1 |

### 3.2 视频编辑与增强 (新增)
| 功能 | 说明 | 模型 | 优先级 |
|------|------|------|--------|
| **视频编辑** | 对视频进行编辑处理 | wan-video-editing | P1 |
| **视频转视频** | 将视频转换为新风格/内容 | wan-video-to-video | P2 |
| **视频风格转换** | 将视频风格转换为动漫/油画等 | video-style-transform | P2 |
| **风格视频** | 基于参考图生成风格化视频 | wan-s2v | P2 |
| **视频口型同步** | 让视频中人物口型与音频同步 | videoretalk | P2 |

### 3.3 首尾帧视频 (已有)
| 功能 | 说明 | 模型 | 优先级 |
|------|------|------|--------|
| 首尾帧视频 | 基于首尾帧生成中间过渡 | vidu-keyframe | P1 |

---

## 四、3D 生成 (新增)

| 功能 | 说明 | 模型 | API端点 | 优先级 |
|------|------|------|---------|--------|
| **文生3D** | 文字描述生成3D模型 | Tripo/Tripo-H3.1 | /services/aigc/3d-generation | P0 |
| **图生3D** | 单张图片生成3D模型 | Tripo/Tripo-H3.1 | /services/aigc/3d-generation | P0 |
| **多视角生3D** | 4张多视角图生成3D模型 | Tripo/Tripo-H3.1 | /services/aigc/3d-generation | P1 |

**3D参数**:
- texture_quality: standard / high
- texture: true / false
- pbr: true / false
- 输出: GLB模型 + 渲染预览图

---

## 五、音频生成 (全新模块)

### 5.1 语音合成 (TTS)
| 功能 | 说明 | 模型 | 优先级 |
|------|------|------|--------|
| **文本转语音** | 文字转自然语音 | qwen-tts | P1 |
| **多音色语音** | 多音色选择TTS | sambert | P1 |
| **情感语音** | 带情感色彩的语音 | cosyvoice-v3-plus | P1 |
| **声音克隆** | 克隆指定声音 | cosyvoice-clone | P2 |

### 5.2 音乐生成
| 功能 | 说明 | 模型 | 优先级 |
|------|------|------|--------|
| **AI音乐生成** | 根据风格/歌词生成音乐 | fun-music | P2 |

---

## 六、OCR与文档 (新增)

| 功能 | 说明 | 模型 | 优先级 |
|------|------|------|--------|
| **图像OCR** | 识别图片中的文字 | qwen-vl-ocr | P2 |
| **文档解析** | 解析PDF/Word等文档 | qwen-vl | P2 |

---

## 七、功能集成建议

### 7.1 必须集成 (P0)
- LLM: qwen-plus/max
- 生图: qwen-image-2.0-pro, wan2.7-image-pro
- 视频: happyhorse-1.0-t2v/i2v/r2v, kling-v3
- 3D: Tripo/Tripo-H3.1

### 7.2 强烈推荐 (P1)
- LLM: deepseek-v3, kimi-k2.5
- 生图编辑: 图像编辑、局部重绘、图像擦除
- 视频: vidu-q3-pro, jimeng-videos, 首尾帧视频
- 音频: TTS语音合成

### 7.3 可选增强 (P2)
- 图像: 图像翻译、肖像风格重绘、背景生成、图像超分
- 视频: 视频编辑、视频风格转换、口型同步
- 音频: 声音克隆、AI音乐生成
- OCR: 图像文字识别

---

## 八、前端页面规划

### 8.1 资产创作中心 (新页面)
```
资产创作中心
├── 生图
│   ├── 文生图
│   ├── 参考图生图
│   ├── 图像编辑
│   ├── 局部重绘
│   └── 图像擦除
├── 生视频
│   ├── 文生视频
│   ├── 图生视频
│   ├── 参考视频
│   ├── 首尾帧视频
│   ├── 视频编辑
│   └── 视频风格转换
├── 生3D
│   ├── 文生3D
│   └── 图生3D
├── 生音频
│   ├── 文本转语音
│   ├── 声音克隆
│   └── AI音乐生成
└── OCR工具
    └── 图像文字识别
```

### 8.2 模型选择器设计
每个功能都需要独立的模型选择器，显示该功能支持的模型列表。
