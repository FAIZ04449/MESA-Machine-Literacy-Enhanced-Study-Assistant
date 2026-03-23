import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
).toString();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PARSE_PDF') {
        getPdfText(request.url)
            .then(text => sendResponse({ result: text }))
            .catch(error => sendResponse({ error: error.message }));
        return true; // Keep channel open
    }
});

async function getPdfText(url) {
    try {
        const response = await fetch(url);
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
        console.error('Offscreen PDF parsing error:', error);
        throw new Error(`Failed to parse PDF: ${error.message}`);
    }
}
