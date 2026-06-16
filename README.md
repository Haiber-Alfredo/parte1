# PDF a LaTeX

Aplicación web que convierte PDFs (incluyendo documentos escaneados) a código LaTeX usando IA.

## Características

- Soporte para PDFs de texto y escaneados (OCR automático)
- Detección y conversión de tablas, fórmulas matemáticas y figuras
- Interfaz drag & drop
- Copiar o descargar el código `.tex` generado
- Procesa hasta 8 páginas por conversión

## Uso

1. Abre `index.html` en tu navegador
2. En `app.js`, reemplaza `TU_API_KEY_AQUI` con tu API key de Anthropic
3. Sube o arrastra un PDF y haz clic en **Convertir a LaTeX**

## Tecnologías

- HTML, CSS, JavaScript (ES Modules)
- [PDF.js](https://mozilla.github.io/pdf.js/) para leer y renderizar PDFs
- [Claude API](https://anthropic.com) para OCR y conversión a LaTeX
