const fs = require('fs');

const md = fs.readFileSync('e:/Jinnah-Medical/OT_ICU_Module_Guide.md', 'utf8');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OT & ICU Module Guide</title>
<style>
@page { size: A4; margin: 20mm; }
body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.7; color: #1f2937; padding: 30px; max-width: 900px; margin: 0 auto; }
h1 { color: #1e3a8a; font-size: 28px; border-bottom: 3px solid #3b82f6; padding-bottom: 12px; margin-top: 0; }
h2 { color: #1e40af; font-size: 20px; margin-top: 30px; border-left: 5px solid #3b82f6; padding-left: 14px; page-break-after: avoid; }
h3 { color: #374151; font-size: 16px; margin-top: 24px; }
pre { background: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 12px; line-height: 1.5; border-left: 4px solid #3b82f6; page-break-inside: avoid; }
code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: 'Consolas', monospace; }
table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 14px; }
th, td { border: 1px solid #d1d5db; padding: 10px 12px; text-align: left; }
th { background: #e5e7eb; font-weight: 600; color: #374151; }
tr:nth-child(even) { background: #f9fafb; }
ul, ol { margin: 12px 0; padding-left: 24px; }
li { margin: 6px 0; }
hr { border: 0; border-top: 2px solid #e5e7eb; margin: 30px 0; }
strong { color: #1e40af; }
blockquote { border-left: 4px solid #3b82f6; margin: 0; padding: 10px 16px; background: #eff6ff; border-radius: 0 8px 8px 0; }
.header-bar { background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 24px; }
.header-bar h1 { color: white; border: none; padding: 0; margin: 0; font-size: 24px; }
.header-bar p { margin: 8px 0 0 0; opacity: 0.9; font-size: 14px; }
.step-box { background: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 8px; margin: 12px 0; }
.warning-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 12px 0; border-radius: 0 8px 8px 0; }
.tip-box { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px 16px; margin: 12px 0; border-radius: 0 8px 8px 0; }
</style>
</head>
<body>
`;

let body = md;

// Convert markdown to HTML
body = body.replace(/^# (.+)$/gm, '<h1>$1</h1>');
body = body.replace(/^## (.+)$/gm, '<h2>$1</h2>');
body = body.replace(/^### (.+)$/gm, '<h3>$1</h3>');
body = body.replace(/^#### (.+)$/gm, '<h4>$1</h4>');

// Bold
body = body.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

// Inline code
body = body.replace(/`([^`]+)`/g, '<code>$1</code>');

// Code blocks
body = body.replace(/```([\s\S]*?)```/g, (match, code) => {
  return '<pre>' + code.trim() + '</pre>';
});

// Horizontal rules
body = body.replace(/^---$/gm, '<hr>');

// Blockquote
body = body.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

// Lists
const lines = body.split('\n');
let inList = false;
let listType = '';
let result = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const ulMatch = line.match(/^(\s*)[-\*]\s(.+)$/);
  const olMatch = line.match(/^(\s*)\d+\.\s(.+)$/);
  
  if (ulMatch) {
    if (!inList || listType !== 'ul') {
      if (inList) result.push(`</${listType}>`);
      result.push('<ul>');
      inList = true;
      listType = 'ul';
    }
    result.push(`<li>${ulMatch[2]}</li>`);
  } else if (olMatch) {
    if (!inList || listType !== 'ol') {
      if (inList) result.push(`</${listType}>`);
      result.push('<ol>');
      inList = true;
      listType = 'ol';
    }
    result.push(`<li>${olMatch[2]}</li>`);
  } else {
    if (inList) {
      result.push(`</${listType}>`);
      inList = false;
      listType = '';
    }
    result.push(line);
  }
}

if (inList) result.push(`</${listType}>`);
body = result.join('\n');

// Tables - simple parsing
body = body.replace(/(\|[^\n]+\|\n\|[-:\s|]+\|\n)(\|[^\n]+\|\n?)+/g, (match) => {
  const rows = match.trim().split('\n');
  if (rows.length < 2) return match;
  
  let tableHtml = '<table>\n';
  // Header row
  const headerCells = rows[0].split('|').filter(c => c.trim() !== '');
  tableHtml += '  <tr>' + headerCells.map(c => `<th>${c.trim()}</th>`).join('') + '</tr>\n';
  // Skip separator row
  // Data rows
  for (let i = 2; i < rows.length; i++) {
    const cells = rows[i].split('|').filter(c => c.trim() !== '');
    tableHtml += '  <tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>\n';
  }
  tableHtml += '</table>';
  return tableHtml;
});

// Paragraphs (wrap non-tag lines)
const paraLines = body.split('\n');
let output = [];
let currentPara = [];

for (const line of paraLines) {
  const trimmed = line.trim();
  if (trimmed === '') {
    if (currentPara.length > 0) {
      output.push('<p>' + currentPara.join('<br>') + '</p>');
      currentPara = [];
    }
  } else if (trimmed.match(/^<(h[1-6]|pre|ul|ol|li|table|tr|th|td|hr|blockquote|div)/)) {
    if (currentPara.length > 0) {
      output.push('<p>' + currentPara.join('<br>') + '</p>');
      currentPara = [];
    }
    output.push(line);
  } else {
    currentPara.push(line);
  }
}

if (currentPara.length > 0) {
  output.push('<p>' + currentPara.join('<br>') + '</p>');
}

body = output.join('\n');

const fullHtml = html + body + '\n</body>\n</html>';
fs.writeFileSync('e:/Jinnah-Medical/OT_ICU_Module_Guide.html', fullHtml);
console.log('HTML created: OT_ICU_Module_Guide.html');
