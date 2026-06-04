import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { getCurrentUser } from '@/lib/auth';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFParser = require('pdf2json');

// 安全配置
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_FORMATS = ['.txt', '.md', '.docx', '.doc', '.pdf'];
const MAX_CONTENT_LENGTH = 500000; // 最大提取字符数

function parsePdf(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on('pdfParser_dataError', (errData: { parserError?: string }) => {
      reject(new Error(errData.parserError || 'PDF解析失败'));
    });
    pdfParser.on('pdfParser_dataReady', (pdfData: { text?: string }) => {
      resolve(pdfData.text || '');
    });
    pdfParser.parseBuffer(buffer);
  });
}

export async function POST(request: NextRequest) {
  try {
    // 权限校验
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '未登录', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '缺少文件' }, { status: 400 });
    }

    // 文件大小限制
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `文件过大，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    
    // 格式白名单检查
    const ext = ALLOWED_FORMATS.find(fmt => fileName.endsWith(fmt));
    if (!ext) {
      return NextResponse.json({ 
        error: `不支持的文件格式，仅支持: ${ALLOWED_FORMATS.join(' / ')}` 
      }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let content = '';

    if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      content = buffer.toString('utf-8');
    } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      const result = await mammoth.extractRawText({ buffer });
      content = result.value;
    } else if (fileName.endsWith('.pdf')) {
      content = await parsePdf(buffer);
    } else {
      return NextResponse.json({ error: '不支持的文件格式，仅支持 txt / docx / pdf' }, { status: 400 });
    }

    if (!content.trim()) {
      return NextResponse.json({ error: '文件内容为空' }, { status: 400 });
    }

    // 内容长度限制，防止内存溢出
    const trimmedContent = content.trim().slice(0, MAX_CONTENT_LENGTH);

    return NextResponse.json({ success: true, content: trimmedContent });
  } catch (error) {
    console.error('文档解析失败:', error);
    return NextResponse.json({ error: '文档解析失败，请检查文件格式' }, { status: 500 });
  }
}
