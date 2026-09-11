import { apiFetch } from '../config/api';

export async function createStreamDirectUpload(maxDurationSeconds = 1200) {
  const response = await apiFetch('/api/stream/direct-upload', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ maxDurationSeconds }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || 'Unable to start the video upload.');
  return body;
}

export async function uploadToStream(uploadURL, file, onProgress) {
  if (!uploadURL) throw new Error('Cloudflare Stream did not return an upload URL.');
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadURL, true);
    xhr.responseType = 'json';
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response || {});
      else reject(new Error(`Video upload failed (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error('Video upload failed. Check your connection and try again.'));
    xhr.onabort = () => reject(new Error('Video upload was cancelled.'));
    const form = new FormData();
    form.append('file', file, file.name || 'video');
    xhr.send(form);
  });
}

export async function getStreamVideoStatus(uid) {
  const response = await apiFetch(`/api/stream/videos/${encodeURIComponent(uid)}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || 'Unable to read video status.');
  return body;
}
