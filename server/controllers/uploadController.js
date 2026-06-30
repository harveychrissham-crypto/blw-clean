import { randomUUID } from 'crypto';
import { supabase, STORAGE_BUCKET } from '../utils/supabaseStorage.js';

// POST /api/uploads — accepts a single file (field name "photo") and
// stores it in Supabase Storage, returning the public URL.
export const uploadPhoto = async (req, res) => {
  if (!supabase) {
    return res.status(503).json({
      error: 'File storage is not configured on the server yet. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    });
  }

  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No file was uploaded. Attach it under the "photo" field.' });
  }
  if (!file.mimetype?.startsWith('image/')) {
    return res.status(400).json({ error: 'Only image files are allowed.' });
  }

  try {
    const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${Date.now()}-${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '31536000',
        upsert: false,
      });

    if (uploadError) {
      console.error('[uploads] supabase upload error', uploadError);
      return res.status(500).json({ error: 'Unable to store the photo right now.' });
    }

    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
    return res.status(201).json({ url: data.publicUrl });
  } catch (error) {
    console.error('[uploads] unexpected error', error);
    return res.status(500).json({ error: 'Unable to upload the photo right now.' });
  }
};
