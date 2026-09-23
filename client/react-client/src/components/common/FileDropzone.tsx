import type { ChangeEvent } from 'react';

interface FileDropzoneProps {
  accept?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  file?: File | null;
  label?: string;
}

export default function FileDropzone({ accept = 'video/*,audio/*,.mp3,.mp4,.wav,.m4a', onChange, file, label = 'Drop file or' }: FileDropzoneProps) {
  return (
    <div className="vs-file-drop">
      <input type="file" accept={accept} onChange={onChange} />
      <div className="vs-file-drop-label">{label} <span>browse</span></div>
      {file && (
        <div className="vs-file-name">📎 {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)</div>
      )}
    </div>
  );
}
