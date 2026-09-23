import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { saveAs } from 'file-saver';

export type ExportFormat = 'txt' | 'pdf' | 'docx';

export function useFileDownload() {
  const downloadTxt = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = (text: string, filename: string) => {
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(text, 180);
    doc.setFontSize(12);
    doc.text(lines, 15, 15);
    doc.save(`${filename}.pdf`);
  };

  const downloadDocx = async (text: string, filename: string) => {
    const doc = new Document({
      sections: [{
        children: text
          .split('\n')
          .map((line) => new Paragraph({ children: [new TextRun(line)] })),
      }],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${filename}.docx`);
  };

  const downloadByFormat = async (text: string, filename: string, format: ExportFormat) => {
    switch (format) {
      case 'txt':  downloadTxt(text, filename); break;
      case 'pdf':  downloadPdf(text, filename); break;
      case 'docx': await downloadDocx(text, filename); break;
    }
  };

  return { downloadTxt, downloadPdf, downloadDocx, downloadByFormat };
}
