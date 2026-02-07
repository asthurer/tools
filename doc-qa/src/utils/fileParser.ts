import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Initialize PDF.js worker
// Using valid CDN URL as a fallback or the direct import if configured in Vite
// In a standard Vite setup, importing the worker URL is preferred:
// import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
// pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// However, to ensure it works without complex build config changes immediately:
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;


export async function parseDocument(file: File): Promise<string> {
    const fileType = file.type;

    if (fileType === 'application/pdf') {
        return parsePDF(file);
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return parseDocx(file);
    } else if (fileType === 'text/plain') {
        return parseText(file);
    } else {
        throw new Error('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
    }
}

async function parsePDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
        fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }

    return fullText;
}

async function parseDocx(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
}

async function parseText(file: File): Promise<string> {
    return await file.text();
}

export function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Remove the Data URL prefix (e.g., "data:application/pdf;base64,")
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
