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

function getFileType(file) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'markdown') return 'md';
  if (SUPPORTED_EXTENSIONS.includes(ext)) return ext;
  return SUPPORTED_TYPES[file.type] || 'txt';
}

export async function parseDocument(file) {
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('File size exceeds 50MB limit');
  }

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
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map(item => item.str).join(' ').trim();
      if (text) pages.push(text);
    }

    const resultText = pages.join('\n\n').trim();
    if (!resultText) {
      throw new Error('No text content found. The PDF may be scanned, image-only, or encrypted.');
    }
    return resultText;
  } catch (e) {
    throw new Error(`Could not parse PDF: ${e.message}`);
  }
}

async function parseDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}
