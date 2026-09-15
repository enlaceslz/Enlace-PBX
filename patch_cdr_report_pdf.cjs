const fs = require('fs');
let code = fs.readFileSync('src/utils/pdfExportHelper.ts', 'utf8');

// The error was that we didn't update pdfExportHelper.ts to export the executive report with the correct title logic
const oldExportPdfTitle = `  doc.text(title, pageWidth - 14, 13, { align: 'right' });`;
const newExportPdfTitle = `  // Split title if it's too long
  if (title.length > 50) {
    doc.text(title.substring(0, 50) + '...', pageWidth - 14, 13, { align: 'right' });
  } else {
    doc.text(title, pageWidth - 14, 13, { align: 'right' });
  }`;

code = code.replace(oldExportPdfTitle, newExportPdfTitle);

fs.writeFileSync('src/utils/pdfExportHelper.ts', code);
console.log('PDF export helper patched');
