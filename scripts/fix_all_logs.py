import re

files_to_fix = [
    'src/app/characters/[id]/page.tsx',
    'src/app/characters/page.tsx',
    'src/app/scripts/page.tsx',
    'src/app/assets/page.tsx',
    'src/app/workspace/page.tsx',
]

for filepath in files_to_fix:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add toast import if not present
    if "from 'sonner'" not in content and 'from "sonner"' not in content:
        # Find the last import line and add after it
        lines = content.split('\n')
        last_import_idx = -1
        for i, line in enumerate(lines):
            if line.startswith('import '):
                last_import_idx = i
        if last_import_idx >= 0:
            lines.insert(last_import_idx + 1, "import { toast } from 'sonner';")
            content = '\n'.join(lines)
    
    # Replace console.log success messages
    content = re.sub(
        r'console\.log\("([^"]*(?:成功|已保存|完成|已复制|生成成功)[^"]*)"\)',
        r'toast.success("\1")',
        content
    )
    
    # Replace console.log failure messages  
    content = re.sub(
        r'console\.log\("([^"]*(?:失败|错误|无效)[^"]*)"\)',
        r'toast.error("\1")',
        content
    )
    
    # Replace console.error with toast.error for specific patterns
    content = re.sub(
        r"console\.error\('([^']*(?:失败|错误)[^']*)'",
        r"toast.error('\1'",
        content
    )
    content = re.sub(
        r'console\.error\("([^"]*(?:失败|错误)[^"]*)"',
        r'toast.error("\1"',
        content
    )
    
    # Replace console.warn with toast.error
    content = content.replace('console.warn(', 'toast.error(')
    
    # Replace remaining generic console.log in catch blocks
    content = re.sub(
        r'console\.log\(([^)]+)\)',
        r'toast.error(String(\1))',
        content
    )
    
    # Replace remaining console.error
    content = re.sub(
        r'console\.error\(([^)]+)\)',
        r'toast.error(String(\1))',
        content
    )
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {filepath}")

print("All done")
