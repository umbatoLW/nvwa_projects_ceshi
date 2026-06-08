/**
 * P3-5: 网格拼接工具
 * 将多个首帧/视角图拼接成一张宫格图
 * 
 * 用于：
 * - 角色多视角宫格图
 * - 剧本分镜首帧预览
 * - 批量生成结果展示
 */

export interface GridConfig {
  cols: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;           // 格子间距
  backgroundColor: string;
  borderStyle?: {
    width: number;
    color: string;
    radius: number;
  };
  labels?: {
    show: boolean;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    style: {
      fontSize: number;
      color: string;
      background?: string;
    };
  };
}

export interface GridCell {
  imageUrl: string;
  label?: string;
  overlay?: {
    text: string;
    position: 'top' | 'bottom' | 'center';
    background: string;
    color: string;
  };
}

// 预设配置
export const GRID_PRESETS = {
  '2x2': { cols: 2, rows: 2 },
  '3x3': { cols: 3, rows: 3 },
  '4x4': { cols: 4, rows: 4 },
  '2x3': { cols: 3, rows: 2 },
  '3x2': { cols: 2, rows: 3 },
  '4x2': { cols: 2, rows: 4 },  // 分镜首帧常用
} as const;

/**
 * 计算网格布局参数
 */
export function calculateGridLayout(
  cellCount: number,
  preferredCols?: number
): { cols: number; rows: number } {
  if (preferredCols) {
    const rows = Math.ceil(cellCount / preferredCols);
    return { cols: preferredCols, rows };
  }

  // 自动选择最佳布局
  if (cellCount <= 4) return { cols: 2, rows: 2 };
  if (cellCount <= 6) return { cols: 3, rows: 2 };
  if (cellCount <= 9) return { cols: 3, rows: 3 };
  if (cellCount <= 12) return { cols: 4, rows: 3 };
  return { cols: 4, rows: Math.ceil(cellCount / 4) };
}

/**
 * 生成网格拼接的 CSS 样式（用于前端渲染）
 */
export function generateGridCSS(config: GridConfig): string {
  const { cols, rows, cellWidth, cellHeight, gap, backgroundColor, borderStyle } = config;

  let css = `
.grid-container {
  display: grid;
  grid-template-columns: repeat(${cols}, ${cellWidth}px);
  grid-template-rows: repeat(${rows}, ${cellHeight}px);
  gap: ${gap}px;
  background-color: ${backgroundColor};
  padding: ${gap}px;
  width: ${cols * cellWidth + (cols + 1) * gap}px;
  height: ${rows * cellHeight + (rows + 1) * gap}px;
}

.grid-cell {
  width: ${cellWidth}px;
  height: ${cellHeight}px;
  overflow: hidden;
  position: relative;
`;

  if (borderStyle) {
    css += `
  border: ${borderStyle.width}px solid ${borderStyle.color};
  border-radius: ${borderStyle.radius}px;
`;
  }

  css += `
}

.grid-cell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
`;

  if (config.labels?.show) {
    const { position, style } = config.labels;
    const positionStyles = {
      'top-left': 'top: 8px; left: 8px;',
      'top-right': 'top: 8px; right: 8px;',
      'bottom-left': 'bottom: 8px; left: 8px;',
      'bottom-right': 'bottom: 8px; right: 8px;',
      'center': 'top: 50%; left: 50%; transform: translate(-50%, -50%);',
    };

    css += `
.grid-label {
  position: absolute;
  ${positionStyles[position]}
  font-size: ${style.fontSize}px;
  color: ${style.color};
  ${style.background ? `background: ${style.background}; padding: 2px 6px; border-radius: 4px;` : ''}
}
`;
  }

  return css;
}

/**
 * 生成网格拼接的 HTML（用于前端渲染）
 */
export function generateGridHTML(cells: GridCell[], config: GridConfig): string {
  const { cols } = config;

  let html = '<div class="grid-container">\n';

  cells.forEach((cell, idx) => {
    html += `  <div class="grid-cell">\n`;
    html += `    <img src="${cell.imageUrl}" alt="Grid cell ${idx + 1}" />\n`;

    if (cell.label && config.labels?.show) {
      html += `    <span class="grid-label">${cell.label}</span>\n`;
    }

    if (cell.overlay) {
      const overlayPos = cell.overlay.position === 'top' ? 'top: 0;' :
                        cell.overlay.position === 'bottom' ? 'bottom: 0;' :
                        'top: 50%; transform: translateY(-50%);';
      html += `    <div class="grid-overlay" style="position: absolute; ${overlayPos} left: 0; right: 0; background: ${cell.overlay.background}; color: ${cell.overlay.color}; padding: 4px 8px; text-align: center;">${cell.overlay.text}</div>\n`;
    }

    html += `  </div>\n`;
  });

  // 填充空白格子
  const totalCells = config.cols * config.rows;
  for (let i = cells.length; i < totalCells; i++) {
    html += `  <div class="grid-cell"></div>\n`;
  }

  html += '</div>';
  return html;
}

/**
 * 生成网格拼接的 Canvas 代码（用于服务端渲染）
 * 返回拼接后的图片 URL
 */
export async function stitchGridImage(
  cells: GridCell[],
  config: GridConfig
): Promise<string> {
  // 注意：服务端 Canvas 操作需要使用 node-canvas 或 sharp
  // 这里返回拼接指令，实际拼接在前端或使用专门的图片处理服务

  const stitchParams = {
    cells: cells.map(c => ({ url: c.imageUrl, label: c.label })),
    config: {
      width: config.cols * config.cellWidth + (config.cols + 1) * config.gap,
      height: config.rows * config.cellHeight + (config.rows + 1) * config.gap,
      cellWidth: config.cellWidth,
      cellHeight: config.cellHeight,
      gap: config.gap,
      backgroundColor: config.backgroundColor,
    },
  };

  // 返回拼接服务的 URL
  // 实际实现需要调用图片拼接服务
  const baseUrl = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
  return `${baseUrl}/api/image/stitch?params=${encodeURIComponent(JSON.stringify(stitchParams))}`;
}

/**
 * 快捷函数：生成角色多视角宫格图
 */
export function createCharacterViewGrid(
  viewImages: { viewType: string; imageUrl: string }[],
  layout: '2x2' | '3x3' | '4x4' = '3x3'
): { html: string; css: string } {
  const preset = GRID_PRESETS[layout];
  const config: GridConfig = {
    cols: preset.cols,
    rows: preset.rows,
    cellWidth: 300,
    cellHeight: 400,
    gap: 8,
    backgroundColor: '#1a1a1a',
    borderStyle: { width: 1, color: '#333', radius: 8 },
    labels: {
      show: true,
      position: 'bottom-left',
      style: { fontSize: 12, color: '#fff', background: 'rgba(0,0,0,0.6)' },
    },
  };

  const cells: GridCell[] = viewImages.map(v => ({
    imageUrl: v.imageUrl,
    label: getViewTypeLabel(v.viewType),
  }));

  return {
    html: generateGridHTML(cells, config),
    css: generateGridCSS(config),
  };
}

// 视角类型中文标签
function getViewTypeLabel(viewType: string): string {
  const labels: Record<string, string> = {
    front: '正面',
    side_left: '左侧',
    side_right: '右侧',
    back: '背面',
    three_quarter: '斜侧',
    close_up: '特写',
    full_body: '全身',
    action_pose: '动态',
  };
  return labels[viewType] || viewType;
}
