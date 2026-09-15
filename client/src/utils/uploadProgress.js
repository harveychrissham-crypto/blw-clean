import { getToken } from './authToken';
import { apiUrl } from '../config/api';

let activeVideoUpload = null;

export function cancelActiveFeedVideoUpload() {
  if (activeVideoUpload) activeVideoUpload.abort();
}

export function uploadFeedVideoWithProgress(file, { onProgress, onStage } = {}) {
  if (!(file instanceof File)) return Promise.reject(new Error('No video file selected.'));
  const form = new FormData();
  form.append('media', file);
  onStage?.('uploading');

  return new Promise(async (resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    activeVideoUpload = xhr;
    const clearActive = () => {
      if (activeVideoUpload === xhr) activeVideoUpload = null;
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      clearActive();
      reject(error instanceof Error ? error : new Error('Unable to upload that video.'));
    };

    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return;
      const loaded = Number(event.loaded || 0);
      const total = Number(event.total || file.size || 0);
      const percent = total ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
      onProgress?.({ percent, loaded, total, loadedMB: loaded / 1024 / 1024, totalMB: total / 1024 / 1024 });
    });
    xhr.onerror = () => fail(new Error('Upload failed. Check your connection and try again.'));
    xhr.onabort = () => fail(new Error('Upload cancelled.'));
    xhr.ontimeout = () => fail(new Error('Upload timed out. Please try again.'));
    xhr.onload = () => {
      if (settled) return;
      let body = {};
      try { body = xhr.responseText ? JSON.parse(xhr.responseText) : {}; } catch { body = {}; }
      if (xhr.status < 200 || xhr.status >= 300) {
        fail(new Error(body?.error || `Upload failed (${xhr.status}).`));
        return;
      }
      settled = true;
      clearActive();
      onProgress?.({ percent: 100, loaded: file.size, total: file.size, loadedMB: file.size / 1024 / 1024, totalMB: file.size / 1024 / 1024 });
      onStage?.('processing');
      resolve(body);
    };

    try {
      const token = await getToken();
      if (settled) return;
      xhr.open('POST', apiUrl('/api/feed/upload'), true);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.timeout = 15 * 60 * 1000;
      xhr.send(form);
    } catch (error) {
      fail(error);
    }
  });
}
