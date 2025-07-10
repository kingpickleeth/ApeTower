import { supabase } from '../lib/supabaseClient';

export async function uploadPfp(walletAddress: string, file: File): Promise<string | null> {
    const fileExt = file.name.split('.').pop();
    const filePath = `${walletAddress}/pfp.${fileExt}`;
  
    const { error } = await supabase.storage.from('pfps').upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });
  
    if (error) {
      console.error('❌ Upload failed:', error); // 🔍 View full error object
      alert('Upload failed: ' + error.message);   // ✅ show reason
      return null;
    }
  
    const { data: urlData } = supabase.storage.from('pfps').getPublicUrl(filePath);
    return urlData?.publicUrl || null;
  }
  