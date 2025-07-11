import { supabase } from '../lib/supabaseClient';

export async function getProfile(walletAddress: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single();

  if (error) console.error('Error fetching profile:', error);
  return data;
}

export async function upsertProfile(walletAddress: string, username: string, pfpUrl: string, bio: string) {
    console.log('Upserting profile:', { walletAddress, username, pfpUrl, bio });
  
    const { data, error } = await supabase.from('profiles').upsert(
      [
        {
          wallet_address: walletAddress,
          username,
          pfp_url: pfpUrl,
          bio
        }
      ],
      {
        onConflict: 'wallet_address'
      }
    );
  
    if (error) {
      console.error('Error saving profile:', error);
      return { error }; // ✅ return the error to caller
    }
  
    console.log('Upsert succeeded:', data);
    return { data }; // ✅ optional but useful
  }
  