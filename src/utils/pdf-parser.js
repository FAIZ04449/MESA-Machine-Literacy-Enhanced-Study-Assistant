import * as pdfjsLib from 'pdfjs-dist';

// Set worker source - this might need adjustment based on build
// For Vite/CRX, we might need to point to a local file or CDN if allowed (but MV3 disallows remote code)
// We will rely on Vite to bundle the worker or we'll set it up in the background script
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
).toString();

export async function getPdfText(url) {
    try {
        const response = await fetch(url);
        // file:// URLs return status 0, which is not "ok" but is successful
        if (!response.ok && response.status !== 0) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data });
        const pdf = await loadingTask.promise;

        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += `Page ${i}:\n${pageText}\n\n`;
        }

        return fullText;
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw new Error(`Failed to parse PDF: ${error.message}`);
    }
}
