import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';

const ANTHROPIC_API_KEY = 'TU_API_KEY_AQUI'; // Reemplaza con tu API key de Anthropic
const MAX_PAGES = 8;

let selectedFile = null;

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f?.type === 'application/pdf') handleFile(f);
  else showError('Solo se aceptan archivos PDF.');
});
fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0]); });

function handleFile(f) {
  selectedFile = f;
  hideError();
  document.getElementById('file-name').textContent = f.name;
  document.getElementById('file-size').textContent = (f.size / 1024).toFixed(1) + ' KB';
  document.getElementById('file-info').classList.remove('hidden');
  document.getElementById('result-area').classList.add('hidden');
  document.getElementById('status-area').classList.add('hidden');
  document.getElementById('page-info').classList.add('hidden');
}

window.convertPDF = async function () {
  if (!selectedFile) return;
  hideError();
  setStatus('Leyendo el PDF…');

  try {
    const arrayBuffer = await selectedFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const pagesToProcess = Math.min(numPages, MAX_PAGES);

    if (numPages > MAX_PAGES) {
      const pi = document.getElementById('page-info');
      pi.textContent = `Solo se procesarán las primeras ${MAX_PAGES} páginas de ${numPages}.`;
      pi.classList.remove('hidden');
    }

    const pageImages = [];
    for (let i = 1; i <= pagesToProcess; i++) {
      setStatus(`Renderizando página ${i} de ${pagesToProcess}…`);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      pageImages.push(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
    }

    setStatus('Analizando con IA (OCR, tablas, fórmulas)…');

    const contentBlocks = pageImages.flatMap((b64, idx) => ([
      { type: 'text', text: `Página ${idx + 1}:` },
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } }
    ]));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        system: `Eres un experto en conversión de documentos a LaTeX. Recibirás imágenes de páginas de un PDF con cualquier tipo de contenido: texto, tablas, fórmulas matemáticas, figuras, listas, etc. Tu tarea: 1) Usar OCR para leer todo el texto incluyendo documentos escaneados. 2) Convertir tablas a entornos LaTeX (tabular, booktabs, longtable). 3) Convertir fórmulas a notación LaTeX correcta ($...$ o $$...$$). 4) Representar figuras con \\begin{figure}. 5) Respetar la estructura: secciones, subsecciones, listas. 6) Incluir preámbulo completo con paquetes necesarios. Devuelve ÚNICAMENTE el código LaTeX completo, sin explicaciones.`,
        messages: [{ role: 'user', content: contentBlocks }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Error de API: ${response.status}`);
    }

    const data = await response.json();
    const latex = data.content.map(b => b.text || '').join('');

    document.getElementById('latex-output').value = latex;
    document.getElementById('result-area').classList.remove('hidden');
    document.getElementById('status-area').classList.add('hidden');

  } catch (err) {
    document.getElementById('status-area').classList.add('hidden');
    showError('Error al procesar: ' + err.message);
  }
};

window.copyLatex = function () {
  navigator.clipboard.writeText(document.getElementById('latex-output').value).then(() => {
    const c = document.getElementById('copy-confirm');
    c.classList.remove('hidden');
    setTimeout(() => c.classList.add('hidden'), 2500);
  });
};

window.downloadLatex = function () {
  const content = document.getElementById('latex-output').value;
  const blob = new Blob([content], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (selectedFile?.name.replace('.pdf', '') || 'documento') + '.tex';
  a.click();
};

window.resetApp = function () {
  selectedFile = null;
  fileInput.value = '';
  document.getElementById('file-info').classList.add('hidden');
  document.getElementById('result-area').classList.add('hidden');
  document.getElementById('status-area').classList.add('hidden');
  document.getElementById('page-info').classList.add('hidden');
  hideError();
};

function setStatus(msg) {
  document.getElementById('status-text').textContent = msg;
  document.getElementById('status-area').classList.remove('hidden');
}
function showError(msg) {
  document.getElementById('error-text').textContent = msg;
  document.getElementById('error-area').classList.remove('hidden');
}
function hideError() {
  document.getElementById('error-area').classList.add('hidden');
}
