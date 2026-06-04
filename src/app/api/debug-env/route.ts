import { NextResponse } from 'next/server';

export async function GET() {
  // 手动加载 .env.local
  const fs = await import('fs');
  const path = await import('path');
  
  const envPath = path.default.join(process.cwd(), '.env.local');
  let envContent = '';
  
  try {
    envContent = fs.default.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value;
        }
      }
    }
  } catch (e) {
    // ignore
  }
  
  return NextResponse.json({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY?.substring(0, 40) + '...',
    COZE_SUPABASE_URL: process.env.COZE_SUPABASE_URL?.substring(0, 50),
    COZE_SUPABASE_ANON_KEY: process.env.COZE_SUPABASE_ANON_KEY?.substring(0, 30),
    NODE_ENV: process.env.NODE_ENV,
    envFileExists: !!envContent,
  });
}
