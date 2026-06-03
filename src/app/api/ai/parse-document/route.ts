import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFParser = require('pdf2json');

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
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: '缺少文件' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
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

    return NextResponse.json({ success: true, content: content.trim() });
  } catch (error) {
    console.error('文档解析失败:', error);
    return NextResponse.json({ error: '文档解析失败，请检查文件格式' }, { status: 500 });
  }
}
