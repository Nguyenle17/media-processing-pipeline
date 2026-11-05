import { useState } from 'react';
import { Download } from 'lucide-react';
import { useFileDownload, type ExportFormat } from '../../hooks/useFileDownload';

interface ExportPanelProps {
  text: string;
  defaultFilename?: string;
}

export default function ExportPanel({ text, defaultFilename = 'transcript' }: ExportPanelProps) {
  const [filename, setFilename] = useState(defaultFilename);
  const [format, setFormat] = useState<ExportFormat>('txt');
  const { downloadByFormat } = useFileDownload();

  return (
    <div className="vs-export-panel">
      <div className="vs-export-row">
        <label className="vs-export-label" htmlFor="export-filename">File name</label>
        <input
          id="export-filename"
          type="text"
          className="vs-export-input"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
        />
      </div>
      <div className="vs-export-row vs-export-row--inline">
        <label className="vs-export-label" htmlFor="export-format">Export as</label>
        <select
          id="export-format"
          className="vs-export-select"
          value={format}
          onChange={(e) => setFormat(e.target.value as ExportFormat)}
        >
          <option value="txt">TXT</option>
          <option value="pdf">PDF</option>
          <option value="docx">DOCX</option>
        </select>
        <button className="vs-btn vs-btn--success" onClick={() => downloadByFormat(text, filename, format)}>
          <Download size={15} /> Download
        </button>
      </div>
    </div>
  );
}
