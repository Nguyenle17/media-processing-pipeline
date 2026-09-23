import type { ChangeEvent } from 'react';
import { FileVideo, UploadCloud } from 'lucide-react';

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
      <div className="vs-file-drop-icon"><UploadCloud size={28} strokeWidth={1.7} /></div>
      <div className="vs-file-drop-label">{label} <span>browse</span></div>
      <div className="vs-file-drop-hint">MP4, MOV, WEBM · up to your server limit</div>
      {file && (
        <div className="vs-file-name"><FileVideo size={14} /> {file.name} <span>({(file.size / 1024 / 1024).toFixed(1)} MB)</span></div>
      )}
    </div>
  );
}
