// Chat markdown renderer - full featured, 100% ASCII for esbuild compat
// Supports: headings, bold/italic, tables, code, lists, blockquotes,
// callouts, images (markdown ![]() syntax), horizontal rules, badges

export function renderMd(text) {
  if (!text || typeof text !== 'string') return '';

  var html = text;

  // 1. Code blocks FIRST (protect from other transforms)
  var codeBlocks = [];
  html = html.replace(/```(\w+)?\n?([\s\S]+?)```/g, function(_, lang, code) {
    var safe = code.trim().replace(/</g,'&lt;').replace(/>/g,'&gt;');
    var label = lang
      ? '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px">' + lang + '</span><button onclick="navigator.clipboard.writeText(this.closest(\'pre\').querySelector(\'code\').textContent)" style="font-size:10px;color:#94a3b8;background:transparent;border:1px solid #334155;border-radius:4px;padding:2px 8px;cursor:pointer">Copiar</button></div>'
      : '';
    var ph = '__CODEBLOCK_' + codeBlocks.length + '__';
    codeBlocks.push(
      '<pre style="background:#0f172a;color:#e2e8f0;padding:14px 16px;border-radius:10px;margin:12px 0;overflow-x:auto;line-height:1.65;border:1px solid #1e293b">'
      + label
      + '<code style="font-family:\'Fira Code\',monospace;font-size:12.5px">' + safe + '</code></pre>'
    );
    return ph;
  });

  // 2. Inline code
  html = html.replace(/`([^`\n]+)`/g, '<code style="background:#f1f5f9;padding:2px 7px;border-radius:5px;font-size:12px;font-family:monospace;color:#1d4ed8;border:1px solid #e2e8f0">$1</code>');

  // 3. Markdown images: ![alt](url)
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, function(_, alt, src) {
    return '<div style="margin:12px 0;text-align:center"><img src="' + src + '" alt="' + alt + '" style="max-width:100%;border-radius:8px;border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,.1)" loading="lazy"/>'
      + (alt ? '<div style="font-size:11px;color:#94a3b8;margin-top:5px;font-style:italic">' + alt + '</div>' : '')
      + '</div>';
  });

  // 4. TABLES - full styled
  html = html.replace(/^(\|.+\|\n)(\|[-| :]+\|\n)((?:\|.+\|\n?)*)/gm, function(match) {
    var rows = match.trim().split('\n');
    var headerCells = rows[0].replace(/^\||\\|$/g,'').split('|');
    // Parse alignment from separator row
    var sepCells = rows[1] ? rows[1].replace(/^\||\\|$/g,'').split('|') : [];
    var aligns = sepCells.map(function(s) {
      s = s.trim();
      if (s.startsWith(':') && s.endsWith(':')) return 'center';
      if (s.endsWith(':')) return 'right';
      return 'left';
    });
    var th = headerCells.map(function(cell, i) {
      return '<th style="padding:10px 14px;text-align:' + (aligns[i]||'left') + ';font-size:12px;font-weight:700;color:#1e3a5f;white-space:nowrap;background:#f8fafc;border-bottom:2px solid #3b82f6">' + cell.trim() + '</th>';
    }).join('');
    var tbody = rows.slice(2).map(function(r, ri) {
      if (!r.trim()) return '';
      var tds = r.replace(/^\||\\|$/g,'').split('|').map(function(cell, i) {
        return '<td style="padding:9px 14px;font-size:12.5px;border-top:1px solid #e2e8f0;text-align:' + (aligns[i]||'left') + ';background:' + (ri%2===0?'white':'#fafafa') + '">' + cell.trim() + '</td>';
      }).join('');
      return '<tr>' + tds + '</tr>';
    }).join('');
    return '<div style="overflow-x:auto;margin:14px 0;border-radius:10px;border:1px solid #e2e8f0;box-shadow:0 1px 6px rgba(0,0,0,.05)">'
      + '<table style="width:100%;border-collapse:collapse;background:white">'
      + '<thead><tr>' + th + '</tr></thead>'
      + '<tbody>' + tbody + '</tbody>'
      + '</table></div>';
  });

  // 5. Headings (with anchor styling)
  html = html.replace(/^#### (.+)$/gm, '<h5 style="margin:10px 0 4px;font-size:12px;font-weight:800;color:#374151">$1</h5>');
  html = html.replace(/^### (.+)$/gm,  '<h4 style="margin:14px 0 6px;font-size:13.5px;font-weight:800;color:#1e3a5f">$1</h4>');
  html = html.replace(/^## (.+)$/gm,   '<h3 style="margin:16px 0 8px;font-size:15px;font-weight:800;color:#1e3a5f;border-bottom:2px solid #3b82f6;padding-bottom:5px">$1</h3>');
  html = html.replace(/^# (.+)$/gm,    '<h2 style="margin:18px 0 10px;font-size:17px;font-weight:900;color:#1e3a5f">$1</h2>');

  // 6. Bold / italic / strikethrough
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g,     '<strong style="color:#1e3a5f">$1</strong>');
  html = html.replace(/\*([^\*\n]+?)\*/g,   '<em style="color:#475569">$1</em>');
  html = html.replace(/~~(.+?)~~/g,         '<s style="opacity:.55">$1</s>');

  // 7. Callout boxes
  html = html.replace(/^> \[!NOTE\]\s*\n> (.+)$/gm, '<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:10px 14px;border-radius:0 8px 8px 0;margin:10px 0"><strong style="color:#1d4ed8">Nota:</strong> $1</div>');
  html = html.replace(/^> \[!WARNING\]\s*\n> (.+)$/gm, '<div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:10px 14px;border-radius:0 8px 8px 0;margin:10px 0"><strong style="color:#d97706">Aviso:</strong> $1</div>');
  html = html.replace(/^> \[!TIP\]\s*\n> (.+)$/gm, '<div style="background:#f0fdf4;border-left:4px solid #10b981;padding:10px 14px;border-radius:0 8px 8px 0;margin:10px 0"><strong style="color:#059669">Dica:</strong> $1</div>');

  // 8. Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote style="border-left:4px solid #3b82f6;padding:8px 14px;margin:8px 0;background:#f0f7ff;color:#334155;border-radius:0 8px 8px 0;font-style:italic;font-size:13px">$1</blockquote>');

  // 9. Callout text lines
  html = html.replace(/^(NOTA|NOTE|DICA|TIP):\s*(.+)$/gm, '<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:10px 14px;border-radius:0 8px 8px 0;margin:8px 0;font-size:13px"><strong style="color:#1d4ed8">$1:</strong> $2</div>');
  html = html.replace(/^(ATENCAO|ATENA\xC7\xC3O|WARNING|AVISO):\s*(.+)$/gm, '<div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:10px 14px;border-radius:0 8px 8px 0;margin:8px 0;font-size:13px"><strong style="color:#d97706">$1:</strong> $2</div>');

  // 10. Horizontal rule
  html = html.replace(/^---+$/gm, '<hr style="border:none;border-top:2px solid #e2e8f0;margin:16px 0"/>');

  // 11. Badge/pill inline: [[label]] or {badge}
  html = html.replace(/\[\[([^\]]+)\]\]/g, '<span style="display:inline-block;padding:2px 9px;border-radius:99px;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:700;border:1px solid #bfdbfe;margin:0 2px">$1</span>');

  // 12. Bullet lists (with proper nesting)
  var lines = html.split('\n');
  var inList = false;
  var result = [];
  for (var i = 0; i < lines.length; i++) {
    var m = lines[i].match(/^(\s*)[-*]\s+(.+)/);
    if (m) {
      if (!inList) { result.push('<ul style="margin:8px 0;padding-left:20px">'); inList = true; }
      result.push('<li style="margin:4px 0;line-height:1.75;font-size:13px">' + m[2] + '</li>');
    } else {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push(lines[i]);
    }
  }
  if (inList) result.push('</ul>');

  // 13. Numbered lists
  var lines2 = result.join('\n').split('\n');
  var inOl = false;
  var result2 = [];
  for (var j = 0; j < lines2.length; j++) {
    var m2 = lines2[j].match(/^\s*\d+\.\s+(.+)/);
    if (m2) {
      if (!inOl) { result2.push('<ol style="margin:8px 0;padding-left:22px">'); inOl = true; }
      result2.push('<li style="margin:4px 0;line-height:1.75;font-size:13px">' + m2[1] + '</li>');
    } else {
      if (inOl) { result2.push('</ol>'); inOl = false; }
      result2.push(lines2[j]);
    }
  }
  if (inOl) result2.push('</ol>');

  // 14. Paragraph breaks
  html = result2.join('\n')
    .replace(/\n\n+/g, '</p><p style="margin:8px 0;line-height:1.8;font-size:13px">')
    .replace(/\n/g, '<br>');

  // 15. Restore code blocks
  codeBlocks.forEach(function(block, idx) {
    html = html.replace('__CODEBLOCK_' + idx + '__', block);
  });

  return '<div style="line-height:1.8;font-size:13px;word-break:break-word">' + html + '</div>';
}
