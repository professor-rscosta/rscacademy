// Chat markdown renderer - ASCII only file for esbuild compat

export function renderMd(text) {
  if (!text) return '';

  var html = text
    .replace(/^### (.+)$/gm, '<h4 style="margin:12px 0 5px;font-size:13px;font-weight:800;color:#1e3a5f">$1</h4>')
    .replace(/^## (.+)$/gm,  '<h3 style="margin:14px 0 7px;font-size:14px;font-weight:800;color:#1e3a5f;border-bottom:2px solid #3b82f6;padding-bottom:4px">$1</h3>')
    .replace(/^# (.+)$/gm,   '<h2 style="margin:14px 0 7px;font-size:16px;font-weight:800;color:#1e3a5f">$1</h2>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,         '<em style="color:#475569">$1</em>')
    .replace(/`([^`]+)`/g,         '<code style="background:#f1f5f9;padding:2px 7px;border-radius:5px;font-size:12px;font-family:monospace;color:#1d4ed8">$1</code>')
    .replace(/^---+$/gm,           '<hr style="border:none;border-top:1px solid #e2e8f0;margin:10px 0"/>')
    .replace(/^> (.+)$/gm,         '<blockquote style="border-left:4px solid #3b82f6;padding:6px 12px;margin:8px 0;background:#f8fafc;color:#475569">$1</blockquote>');

  // Code blocks
  html = html.replace(/```([\s\S]+?)```/g, function(_, code) {
    return '<pre style="background:#1e293b;color:#e2e8f0;padding:12px 14px;border-radius:8px;font-size:12px;margin:8px 0"><code>'
      + code.trim().replace(/</g,'&lt;').replace(/>/g,'&gt;')
      + '</code></pre>';
  });

  // Bullet lists
  var lines = html.split('\n');
  var inList = false;
  var result = [];
  for (var i = 0; i < lines.length; i++) {
    var m = lines[i].match(/^\s*[-*]\s+(.+)/);
    if (m) {
      if (!inList) { result.push('<ul style="margin:8px 0;padding-left:18px;list-style:disc">'); inList = true; }
      result.push('<li style="margin:3px 0;line-height:1.6">' + m[1] + '</li>');
    } else {
      if (inList) { result.push('</ul>'); inList = false; }
      result.push(lines[i]);
    }
  }
  if (inList) result.push('</ul>');

  // Numbered lists
  var lines2 = result.join('\n').split('\n');
  var inOl = false;
  var result2 = [];
  for (var j = 0; j < lines2.length; j++) {
    var m2 = lines2[j].match(/^\s*\d+\.\s+(.+)/);
    if (m2) {
      if (!inOl) { result2.push('<ol style="margin:8px 0;padding-left:20px">'); inOl = true; }
      result2.push('<li style="margin:3px 0;line-height:1.6">' + m2[1] + '</li>');
    } else {
      if (inOl) { result2.push('</ol>'); inOl = false; }
      result2.push(lines2[j]);
    }
  }
  if (inOl) result2.push('</ol>');

  html = result2.join('\n')
    .replace(/\n\n+/g, '</p><p style="margin:8px 0;line-height:1.7">')
    .replace(/\n/g, '<br/>');

  return '<div style="line-height:1.7">' + html + '</div>';
}
