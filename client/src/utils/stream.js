import { apiFetch } from '../config/api';

const TUS_VERSION = '1.0.0';
const DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024;
const MAX_CHUNK_ATTEMPTS = 4;
const RETRY_BASE_DELAY_MS = 1000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function encodeMetadata(metadata) {
  return Object.entries(metadata)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key} ${btoa(unescape(encodeURIComponent(String(value))))}`)
    .join(',');
}

async function tusCreate(uploadConfig, file) {
  const response = await fetch(uploadConfig.endpoint, {
    method: 'POST',
    headers: {
      'Tus-Resumable': TUS_VERSION,
      'Upload-Length': String(file.size),
      AuthorizationSignature: uploadConfig.signature,
      AuthorizationExpire: String(uploadConfig.expirationTime),
      VideoId: uploadConfig.videoId,
      LibraryId: String(uploadConfig.libraryId),
      'Upload-Metadata': encodeMetadata({ filename: file.name || 'video', filetype: file.type || 'video/mp4' }),
    },
  });
  if (!response.ok) throw new Error(`Unable to initialize video upload (${response.status}).`);
  const location = response.headers.get('Location');
  if (!location) throw new Error('Bunny Stream did not return an upload location.');
  return location;
}

async function tusPatch(url, chunk, offset, uploadConfig, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PATCH', url, true);
    xhr.setRequestHeader('Tus-Resumable', TUS_VERSION);
    xhr.setRequestHeader('Content-Type', 'application/offset+octet-stream');
    xhr.setRequestHeader('Upload-Offset', String(offset));
    xhr.setRequestHeader('AuthorizationSignature', uploadConfig.signature);
    xhr.setRequestHeader('AuthorizationExpire', String(uploadConfig.expirationTime));
    xhr.setRequestHeader('VideoId', uploadConfig.videoId);
    xhr.setRequestHeader('LibraryId', String(uploadConfig.libraryId));
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded, chunk.size, offset);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const nextOffset = Number(xhr.getResponseHeader('Upload-Offset'));
        resolve(Number.isFinite(nextOffset) ? nextOffset : offset + chunk.size);
      } else {
        reject(new Error(`Video upload failed (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error('Video upload failed. Check your connection and try again.'));
    xhr.onabort = () => reject(new Error('Video upload was cancelled.'));
    xhr.send(chunk);
  });
}

// Queried before retrying a failed chunk. If the server actually received
// the bytes we think failed (the PATCH succeeded but the response never
// reached us, a common failure mode on flaky mobile connections), resuming
// from a stale local offset would resend and misalign data. TUS uploads
// are resumable specifically so a client can ask "how far did we get?"
// instead of guessing.
async function tusHead(url, uploadConfig) {
  const response = await fetch(url, {
    method: 'HEAD',
    headers: {
      'Tus-Resumable': TUS_VERSION,
      AuthorizationSignature: uploadConfig.signature,
      AuthorizationExpire: String(uploadConfig.expirationTime),
      VideoId: uploadConfig.videoId,
      LibraryId: String(uploadConfig.libraryId),
    },
  });
  if (!response.ok) throw new Error(`Unable to check upload progress (${response.status}).`);
  const offset = Number(response.headers.get('Upload-Offset'));
  if (!Number.isFinite(offset)) throw new Error('Bunny Stream did not report an upload offset.');
  return offset;
}

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

  const uploadUrl = await tusCreate(uploadConfig, file);
  let offset = 0;
  const chunkSize = Math.min(DEFAULT_CHUNK_SIZE, file.size || DEFAULT_CHUNK_SIZE);

  while (offset < file.size) {
    let lastError = null;
    let succeeded = false;
    for (let attempt = 1; attempt <= MAX_CHUNK_ATTEMPTS && !succeeded; attempt += 1) {
      try {
        const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size));
        const nextOffset = await tusPatch(uploadUrl, chunk, offset, uploadConfig, (loaded) => {
          const totalUploaded = offset + loaded;
          onProgress?.(Math.round((totalUploaded / file.size) * 100));
        });
        if (nextOffset <= offset) throw new Error('Bunny Stream returned an invalid upload offset.');
        offset = nextOffset;
        succeeded = true;
      } catch (err) {
        lastError = err;
        if (attempt >= MAX_CHUNK_ATTEMPTS) break;
        // A dropped connection mid-chunk is exactly what TUS resumability
        // is for -- check what the server actually has before blindly
        // resending, then back off a little longer each retry.
        try { offset = await tusHead(uploadUrl, uploadConfig); } catch { /* retry from what we already have */ }
        await wait(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    }
    if (!succeeded) throw lastError || new Error('Video upload failed. Check your connection and try again.');
  }

  onProgress?.(100);
  return {
    uid: uploadConfig.videoId,
    url: uploadConfig.manifestUrl,
    mediaType: 'video',
    manifestUrl: uploadConfig.manifestUrl,
  };
}

export async function getStreamVideoStatus(uid) {
  const response = await apiFetch(`/api/stream/videos/${encodeURIComponent(uid)}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || 'Unable to read video status.');
  return body;
}
