import { supabase } from './supabase';

export async function uploadAudioToSupabase(blob: Blob, filename: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('lectures')
    .upload(`audio/${filename}`, blob, {
      contentType: 'audio/webm',
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('lectures')
    .getPublicUrl(`audio/${filename}`);

  return publicUrl;
}
