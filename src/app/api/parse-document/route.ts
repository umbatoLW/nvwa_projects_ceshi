import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import pdf from "pdf-parse";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "未提供文件" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() || "";

    let content = "";
    if (ext === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      content = result.value;
    } else if (ext === "pdf") {
      const result = await pdf(buffer);
      content = result.text;
    } else if (ext === "txt" || ext === "md") {
      content = buffer.toString("utf-8");
    } else {
      return NextResponse.json(
        { error: "不支持的文件格式，仅支持 .txt/.md/.docx/.pdf" },
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
