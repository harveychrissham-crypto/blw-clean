import { Upload } from 'tus-js-client';
import { apiFetch } from '../config/api';

export async function createStreamDirectUpload(maxDurationSeconds = 1200, title = 'BLW Feed Video') {
  const response = await apiFetch('/api/stream/direct-upload', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ maxDurationSeconds, title }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || 'Unable to start the video upload.');
  return body;
}

export async function uploadToStream(uploadConfig, file, onProgress) {
  if (!uploadConfig?.endpoint || !uploadConfig?.videoId || !uploadConfig?.signature || !uploadConfig?.expirationTime || !uploadConfig?.libraryId) {
    throw new Error('Bunny Stream did not return valid upload credentials.');
  }
  if (!file) throw new Error('Choose a video first.');

  return new Promise((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: uploadConfig.endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
      chunkSize: 10 * 1024 * 1024,
      headers: {
        AuthorizationSignature: uploadConfig.signature,
        AuthorizationExpire: String(uploadConfig.expirationTime),
        VideoId: uploadConfig.videoId,
        LibraryId: String(uploadConfig.libraryId),
      },
      metadata: {
        filename: file.name || 'video',
        filetype: file.type || 'video/mp4',
      },
      onError: (error) => reject(new Error(error?.message || 'Video upload failed.')),
      onProgress: (bytesUploaded, bytesTotal) => {
        const percent = bytesTotal ? Math.round((bytesUploaded / bytesTotal) * 100) : 0;
        onProgress?.(percent);
      },
      onSuccess: () => resolve({
        uid: uploadConfig.videoId,
        url: uploadConfig.manifestUrl,
        mediaType: 'video',
        manifestUrl: uploadConfig.manifestUrl,
      }),
    });

    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads?.length) upload.resumeFromPreviousUpload(previousUploads[0]);
      upload.start();
    }).catch(() => upload.start());
  });
}

export async function getStreamVideoStatus(uid) {
  const response = await apiFetch(`/api/stream/videos/${encodeURIComponent(uid)}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || 'Unable to read video status.');
  return body;
}
