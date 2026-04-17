// Chat markdown renderer - full featured, ASCII-only for esbuild compat

export function renderMd(text) {
  if (!text || typeof text !== 'string') return '';

  var html = text;

  // 1. Code blocks FIRST (protect content inside)
  var codeBlocks = [];
  html = html.replace(/```(\w+)?\n?([\s\S]+?)```/g, function(_, lang, code) {
    var safe = code.trim().replace(/</g,'&lt;').replace(/>/g,'&gt;');
    var label = lang ? '<span style="float:right;font-size:10px;opacity:.5;text-transform:uppercase">' + lang + '</span>' : '';
    var placeholder = '__CODEBLOCK_' + codeBlocks.length + '__';
    codeBlocks.push('<pre style="background:#1e293b;color:#e2e8f0;padding:14px 16px;border-radius:10px;font-size:12px;margin:10px 0;overflow-x:auto;line-height:1.6"><code>' + label + safe + '</code></pre>');
    return placeholder;
  });

  // 2. Inline code
  html = html.replace(/`([^`\n]+)`/g, '<code style="background:#f1f5f9;padding:2px 7px;border-radius:5px;font-size:12px;font-family:monospace;color:#1d4ed8;word-break:break-word">$1</code>');

  // 3. TABLES - parse markdown tables
  html = html.replace(/^(\|.+\|\n)(\|[-| :]+\|\n)((?:\|.+\|\n?)*)/gm, function(match) {
    var rows = match.trim().split('\n');
    var headerRow = rows[0];
    // rows[1] is separator
    var bodyRows  = rows.slice(2);
    var th = headerRow.replace(/^\||\|$/g,'').split('|').map(function(c) {
      return '<th style="padding:8px 12px;text-align:left;font-size:12px;font-weight:700;color:#1e3a5f;white-space:nowrap">' + c.trim() + '</th>';
    }).join('');
    var tbody = bodyRows.map(function(r) {
      if (!r.trim()) return '';
      var tds = r.replace(/^\||\|$/g,'').split('|').map(function(c) {
        return '<td style="padding:8px 12px;font-size:12px;border-top:1px solid #e2e8f0">' + c.trim() + '</td>';
      }).join('');
      return '<tr>' + tds + '</tr>';
    }).join('');
    return '<div style="overflow-x:auto;margin:10px 0"><table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0"><thead><tr style="background:#f8fafc">' + th + '</tr></thead><tbody>' + tbody + '</tbody></table></div>';
  });

  // 4. Headings
  html = html.replace(/^#### (.+)$/gm, '<h5 style="margin:10px 0 4px;font-size:12px;font-weight:800;color:#1e3a5f">$1</h5>');
  html = html.replace(/^### (.+)$/gm,  '<h4 style="margin:12px 0 6px;font-size:13px;font-weight:800;color:#1e3a5f">$1</h4>');
  html = html.replace(/^## (.+)$/gm,   '<h3 style="margin:14px 0 7px;font-size:15px;font-weight:800;color:#1e3a5f;border-bottom:2px solid #3b82f6;padding-bottom:5px">$1</h3>');
  html = html.replace(/^# (.+)$/gm,    '<h2 style="margin:16px 0 8px;font-size:17px;font-weight:900;color:#1e3a5f">$1</h2>');

  // 5. Bold / italic / strikethrough
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g,     '<strong style="color:#1e3a5f">$1</strong>');
  html = html.replace(/\*([^\*\n]+?)\*/g,   '<em style="color:#475569">$1</em>');
  html = html.replace(/~~(.+?)~~/g,         '<s style="opacity:.6">$1</s>');

  // 6. Blockquote
  html = html.replace(/^> (.+)$/gm, '<blockquote style="border-left:4px solid #3b82f6;padding:8px 14px;margin:8px 0;background:#f0f7ff;color:#334155;border-radius:0 8px 8px 0;font-style:italic">$1</blockquote>');

  // 7. Horizontal rule
  html = html.replace(/^---+$/gm, '<hr style="border:none;border-top:2px solid #e2e8f0;margin:14px 0"/>');

  // 8. Callout boxes (e.g. > [!NOTE], > [!WARNING])
  html = html.replace(/^(NOTA|NOTE|DICA|TIP):\s*(.+)$/gm, '<div style="background:#eff6ff;border-left:4px solid #3b82f6;padding:10px 14px;border-radius:0 8px 8px 0;margin:8px 0;font-size:13px"><strong style="color:#1d4ed8">$1:</strong> $2</div>');
  html = html.replace(/^(ATENCAO|ATENÇÃO|WARNING|AVISO):\s*(.+)$/gm, '<div style="background:#fffbeb;border-left:4px solid #f59e0b;padding:10px 14px;border-radius:0 8px 8px 0;margin:8px 0;font-size:13px"><strong style="color:#d97706">$1:</strong> $2</div>');

  // 9. Bullet lists
  var lines = html.split('\n');
  var inList = false;
  var result = [];
  for (var i = 0; i < lines.length; i++) {
    var m = lines[i].match(/^\s*[-*]\s+(.+)/);
    if (m) {
      if (!inList) { result.push('<ul style="margin:8px 0;padding-left:20px">'); inList = true; }
      result.push('<li style="margin:4px 0;line-height:1.7;font-size:13px">' + m[1] + '</li>');
    } else {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push(lines[i]);
    }
  }
  if (inList) result.push('</ul>');

  // 10. Numbered lists
  var lines2 = result.join('\n').split('\n');
  var inOl = false;
  var result2 = [];
  for (var j = 0; j < lines2.length; j++) {
    var m2 = lines2[j].match(/^\s*\d+\.\s+(.+)/);
    if (m2) {
      if (!inOl) { result2.push('<ol style="margin:8px 0;padding-left:22px">'); inOl = true; }
      result2.push('<li style="margin:4px 0;line-height:1.7;font-size:13px">' + m2[1] + '</li>');
    } else {
      if (inOl) { result2.push('</ol>'); inOl = false; }
      result2.push(lines2[j]);
    }
  }
  if (inOl) result2.push('</ol>');

  // 11. Paragraph breaks
  html = result2.join('\n').replace(/\n\n+/g, '</p><p style="margin:8px 0;line-height:1.8;font-size:13px">').replace(/\n/g, '<br>');

  // 12. Restore code blocks
  codeBlocks.forEach(function(block, idx) {
    html = html.replace('__CODEBLOCK_' + idx + '__', block);
  });

  return '<div style="line-height:1.8;font-size:13px">' + html + '</div>';
}
