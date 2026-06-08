import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import pdf from "pdf-parse";

// 文件大小限制：10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 超时包装函数
function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMsg)), ms)
    )
  ]);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "未提供文件" }, { status: 400 });
    }

    // 检查文件大小
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `文件过大（${(file.size / 1024 / 1024).toFixed(2)}MB），最大支持 10MB` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() || "";

    let content = "";
    if (ext === "docx") {
      // Word 文档解析，设置 30 秒超时
      try {
        const result = await withTimeout(
          mammoth.extractRawText({ buffer }),
          30000,
          "Word 文档解析超时，请尝试将内容复制到 txt 文件后上传"
        );
        content = result.value;
      } catch (mammothErr) {
        console.error("[parse-document] mammoth error:", mammothErr);
        const errMsg = mammothErr instanceof Error ? mammothErr.message : "Word 文档解析失败";
        return NextResponse.json(
          { error: errMsg + "，建议将内容复制到 txt 文件后上传" },
          { status: 500 }
        );
      }
    } else if (ext === "pdf") {
      // PDF 解析，设置 30 秒超时
      try {
        const result = await withTimeout(
          pdf(buffer),
          30000,
          "PDF 解析超时，请尝试将内容复制到 txt 文件后上传"
        );
        content = result.text;
      } catch (pdfErr) {
        console.error("[parse-document] pdf error:", pdfErr);
        const errMsg = pdfErr instanceof Error ? pdfErr.message : "PDF 解析失败";
        return NextResponse.json(
          { error: errMsg + "，建议将内容复制到 txt 文件后上传" },
          { status: 500 }
        );
      }
    } else if (ext === "txt" || ext === "md") {
      content = buffer.toString("utf-8");
    } else {
      return NextResponse.json(
        { error: "不支持的文件格式，仅支持 .txt/.md/.docx/.pdf" },
        { status: 400 }
      );
    }

    // 检查解析结果
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "文档解析结果为空，请检查文件内容" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, content });
  } catch (err) {
    console.error("[parse-document] error:", err);
    return NextResponse.json(
      { error: "文件解析失败，请检查文件是否损坏" },
      { status: 500 }
    );
  }
}
