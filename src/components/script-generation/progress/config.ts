/**
 * 三阶段配置常量
 */
import {
  MessageSquare,
  FileText,
  PenTool,
} from 'lucide-react';

export const STAGES = [
  {
    id: 1,
    name: '核心对话生成',
    description: '生成每集核心场景对话、金句台词',
    icon: MessageSquare,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10',
  },
  {
    id: 2,
    name: '完整大纲生成',
    description: '人物设定、四层反派、付费卡点标注',
    icon: FileText,
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
  },
  {
    id: 3,
    name: '逐集撰写',
    description: '注入知识库指导、钩子设计',
    icon: PenTool,
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
  },
];
