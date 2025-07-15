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
  export async function upgradeCampaignLevel(walletAddress: string, targetLevel: number) {
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('campaign_level')
        .eq('wallet_address', walletAddress)
        .single();
  
      if (fetchError) {
        console.error('❌ Error fetching campaign level:', fetchError);
        return { error: fetchError };
      }
  
      const currentLevel = data?.campaign_level ?? 1;
  
      if (currentLevel >= targetLevel) {
        console.log(`✅ campaign_level already ${currentLevel}, no update needed.`);
        return { data: currentLevel };
      }
  
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ campaign_level: targetLevel })
        .eq('wallet_address', walletAddress);
  
      if (updateError) {
        console.error('❌ Error updating campaign_level:', updateError);
        return { error: updateError };
      }
  
      console.log(`🚀 campaign_level upgraded: ${currentLevel} ➡️ ${targetLevel}`);
      return { data: targetLevel };
    } catch (e) {
      console.error('🔥 Exception in upgradeCampaignLevel:', e);
      return { error: e };
    }
  }
  
  export async function updateVineBalance(walletAddress: string, vineEarned: number) {
    try {
      // 🧠 Step 1: Fetch current total_vine
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('total_vine')
        .eq('wallet_address', walletAddress)
        .single();
  
      if (fetchError) {
        console.error('❌ Error fetching profile for vine update:', fetchError);
        return { error: fetchError };
      }
  
      const currentBalance = Number(profile?.total_vine ?? 0);
      const newBalance = currentBalance + vineEarned;


  
      // 💾 Step 2: Update total_vine
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ total_vine: newBalance })
        .eq('wallet_address', walletAddress);
  
      if (updateError) {
        console.error('❌ Error updating vine balance:', updateError);
        return { error: updateError };
      }
  
      console.log(`🌿 $VINE updated: ${currentBalance} ➡️ ${newBalance}`);
      return { data: newBalance };
    } catch (e) {
      console.error('🔥 Exception in updateVineBalance:', e);
      return { error: e };
    }
  }
  export async function getProfileByUsername(username: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();
  
    if (error) {
      console.error("🔍 Error checking username:", error);
      return null;
    }
    return data;
  }
  
  