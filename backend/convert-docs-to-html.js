const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// Configurar marked
marked.setOptions({
  headerIds: true,
  mangle: false,
  breaks: true,
  gfm: true
});

// Leer el archivo markdown
const mdPath = path.join(__dirname, 'DOCUMENTACION_TECNICA_COMPLETA.md');
const mdContent = fs.readFileSync(mdPath, 'utf-8');

// Convertir a HTML
const htmlContent = marked.parse(mdContent);

// Template HTML con estilos
const htmlTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documentación Técnica - StoryClip</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #e2e8f0;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            min-height: 100vh;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        header {
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            padding: 40px 20px;
            margin-bottom: 40px;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(59, 130, 246, 0.3);
        }

        header h1 {
            color: white;
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        header p {
            color: rgba(255,255,255,0.9);
            font-size: 1.1rem;
        }

        .content {
            background: rgba(30, 41, 59, 0.6);
            backdrop-filter: blur(10px);
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            border: 1px solid rgba(255,255,255,0.1);
        }

        h1 {
            color: #60a5fa;
            font-size: 2rem;
            margin: 40px 0 20px 0;
            padding-bottom: 10px;
            border-bottom: 2px solid #3b82f6;
        }

        h2 {
            color: #7dd3fc;
            font-size: 1.6rem;
            margin: 30px 0 15px 0;
            padding-left: 10px;
            border-left: 4px solid #3b82f6;
        }

        h3 {
            color: #93c5fd;
            font-size: 1.3rem;
            margin: 25px 0 10px 0;
        }

        h4 {
            color: #bfdbfe;
            font-size: 1.1rem;
            margin: 20px 0 10px 0;
        }

        h5 {
            color: #dbeafe;
            font-size: 1rem;
            margin: 15px 0 8px 0;
        }

        p {
            margin-bottom: 15px;
            color: #cbd5e1;
        }

        a {
            color: #60a5fa;
            text-decoration: none;
            border-bottom: 1px dotted #60a5fa;
        }

        a:hover {
            color: #93c5fd;
            border-bottom-color: #93c5fd;
        }

        code {
            background: rgba(15, 23, 42, 0.8);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            color: #f472b6;
            border: 1px solid rgba(244, 114, 182, 0.2);
        }

        pre {
            background: rgba(15, 23, 42, 0.9);
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 20px 0;
            border: 1px solid rgba(59, 130, 246, 0.3);
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        }

        pre code {
            background: none;
            padding: 0;
            border: none;
            color: #e2e8f0;
        }

        ul, ol {
            margin: 15px 0 15px 30px;
            color: #cbd5e1;
        }

        li {
            margin-bottom: 8px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: rgba(15, 23, 42, 0.6);
            border-radius: 8px;
            overflow: hidden;
        }

        th {
            background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }

        td {
            padding: 10px 12px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            color: #cbd5e1;
        }

        tr:hover {
            background: rgba(59, 130, 246, 0.1);
        }

        blockquote {
            border-left: 4px solid #3b82f6;
            padding: 15px 20px;
            margin: 20px 0;
            background: rgba(59, 130, 246, 0.1);
            border-radius: 0 8px 8px 0;
            color: #cbd5e1;
        }

        hr {
            border: none;
            border-top: 2px solid rgba(59, 130, 246, 0.3);
            margin: 40px 0;
        }

        .toc {
            background: rgba(59, 130, 246, 0.1);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border: 1px solid rgba(59, 130, 246, 0.3);
        }

        .toc h2 {
            border: none;
            padding: 0;
            margin-top: 0;
        }

        /* Badges and labels */
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            font-weight: 600;
            margin-right: 5px;
        }

        /* Scrollbar styling */
        ::-webkit-scrollbar {
            width: 10px;
            height: 10px;
        }

        ::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.5);
        }

        ::-webkit-scrollbar-thumb {
            background: #3b82f6;
            border-radius: 5px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: #60a5fa;
        }

        /* Print styles */
        @media print {
            body {
                background: white;
                color: black;
            }
            .content {
                background: white;
                box-shadow: none;
            }
        }

        /* Responsive */
        @media (max-width: 768px) {
            .container {
                padding: 10px;
            }
            header {
                padding: 20px 15px;
            }
            header h1 {
                font-size: 1.8rem;
            }
            .content {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>📚 Documentación Técnica - StoryClip</h1>
            <p>Guía completa para desarrolladores</p>
        </header>

        <div class="content">
            ${htmlContent}
        </div>

        <footer style="text-align: center; padding: 40px 20px; color: #64748b;">
            <p>© 2025 StoryClip - Documentación Técnica</p>
            <p style="font-size: 0.9em; margin-top: 10px;">Generado automáticamente desde DOCUMENTACION_TECNICA_COMPLETA.md</p>
        </footer>
    </div>
</body>
</html>`;

// Crear directorio docs si no existe
const docsDir = path.join(__dirname, 'public', 'docs');
if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
}

// Crear directorio en outputs (accesible públicamente)
const outputsDocsDir = path.join(__dirname, 'outputs', 'docs');
if (!fs.existsSync(outputsDocsDir)) {
    fs.mkdirSync(outputsDocsDir, { recursive: true });
}

// Guardar HTML en ambas ubicaciones
const htmlPath = path.join(docsDir, 'index.html');
const htmlOutputPath = path.join(outputsDocsDir, 'index.html');
fs.writeFileSync(htmlPath, htmlTemplate);
fs.writeFileSync(htmlOutputPath, htmlTemplate);

console.log('✅ Documentación convertida exitosamente!');
console.log(`📄 Archivo generado: ${htmlPath}`);
console.log(`📄 Archivo público: ${htmlOutputPath}`);
console.log('🌐 URL: https://story.creatorsflow.app/outputs/docs/');
console.log('\n📋 También se creó una copia del markdown');

// Copiar también el markdown en ambas ubicaciones
const mdDestPath = path.join(docsDir, 'DOCUMENTACION_TECNICA_COMPLETA.md');
const mdOutputPath = path.join(outputsDocsDir, 'DOCUMENTACION_TECNICA_COMPLETA.md');
fs.copyFileSync(mdPath, mdDestPath);
fs.copyFileSync(mdPath, mdOutputPath);

console.log('✅ Markdown copiado: ' + mdDestPath);
console.log('✅ Markdown público: ' + mdOutputPath);
