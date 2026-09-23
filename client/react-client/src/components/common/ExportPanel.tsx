import { useState } from 'react';
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
        <label className="vs-export-label">File name</label>
        <input type="text" className="vs-export-input" value={filename}
          onChange={(e) => setFilename(e.target.value)} />
      </div>
      <div className="vs-export-row vs-export-row--inline">
        <label className="vs-export-label">Export as</label>
        <select className="vs-export-select" value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)}>
          <option value="txt">.txt</option>
          <option value="pdf">.pdf</option>
          <option value="docx">.docx</option>
        </select>
        <button className="vs-btn vs-btn--success" onClick={() => downloadByFormat(text, filename, format)}>
          ↓ Download
        </button>
      </div>
    </div>
  );
}
