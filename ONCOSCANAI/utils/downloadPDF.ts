import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Captures the DOM element with the given id and saves it as a PDF.
 * @param elementId  id of the report container div
 * @param fileName   output file name (without .pdf extension)
 */
export async function downloadReportAsPDF(elementId: string, fileName: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`downloadReportAsPDF: element #${elementId} not found`);
    return;
  }

  // Capture the element at 2× scale for crisp text
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const imgWidth  = canvas.width;
  const imgHeight = canvas.height;

  // A4 dimensions in mm
  const pdfWidth  = 210;
  const pdfHeight = (imgHeight * pdfWidth) / imgWidth;

  const pdf = new jsPDF({
    orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
    unit: 'mm',
    format: [pdfWidth, pdfHeight],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(`${fileName}.pdf`);
}
