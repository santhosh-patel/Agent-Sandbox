// ========================================
// Document Parser — PDF, DOCX, TXT, Markdown
// ========================================

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href;

const SUPPORTED_TYPES = {
  'text/plain': 'txt',
  'text/markdown': 'md',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

const SUPPORTED_EXTENSIONS = ['txt', 'md', 'markdown', 'pdf', 'docx'];

export function isSupportedFile(file) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext) || SUPPORTED_TYPES[file.type];
}

export function getFileType(file) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'markdown') return 'md';
  if (SUPPORTED_EXTENSIONS.includes(ext)) return ext;
  return SUPPORTED_TYPES[file.type] || 'txt';
}

export async function parseDocument(file) {
  const type = getFileType(file);

  switch (type) {
    case 'txt':
    case 'md':
      return await file.text();
    case 'pdf':
      return await parsePdf(file);
    case 'docx':
      return await parseDocx(file);
    default:
      return await file.text();
  }
}

async function parsePdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map(item => item.str).join(' ');
    pages.push(text);
  }

  return pages.join('\n\n');
}

async function parseDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
