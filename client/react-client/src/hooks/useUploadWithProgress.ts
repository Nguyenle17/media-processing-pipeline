import { useState, useCallback } from 'react';
import Api from '../api/Api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function useUploadWithProgress() {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback((endpoint: string, formData: FormData): Promise<any> => {
    return new Promise((resolve, reject) => {
      setIsUploading(true);
      setProgress(0);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE_URL}${endpoint}`);
      xhr.withCredentials = true;
      xhr.setRequestHeader('Authorization', `Bearer ${Api.token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        setIsUploading(false);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          let message = `Upload failed: ${xhr.status}`;
          try {
            const body = JSON.parse(xhr.responseText);
            message = body.message || body.error || message;
          } catch { /* keep the HTTP status */ }
          reject(new Error(message));
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        reject(new Error('Network error'));
      };

      xhr.send(formData);
    });
  }, []);

  const reset = useCallback(() => {
    setProgress(0);
    setIsUploading(false);
  }, []);

  return { upload, progress, isUploading, reset };
}
