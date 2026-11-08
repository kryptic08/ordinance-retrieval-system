import os

files = {
    'react.svg': '#087ea4',
    'typescript.svg': '#3178c6',
    'tailwindcss.svg': '#0ea5e9',
    'nextjs.svg': '#000000',
    'python.svg': '#3776ab',
}

for fname, color in files.items():
    p = os.path.join('remotion-video', 'public', 'tech', fname)
    if os.path.exists(p):
        with open(p, 'r', encoding='utf-8') as f:
            content = f.read()
        if 'fill=' not in content:
            content = content.replace('<svg ', f'<svg fill="{color}" ', 1)
            with open(p, 'w', encoding='utf-8') as f:
                f.write(content)
            print('Updated fill for', fname)
        else:
            print(fname, 'already has fill')
