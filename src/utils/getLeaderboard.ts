import { supabase } from '../lib/supabaseClient'; // ✅ Go up one level

export async function getLeaderboard() {
  const { data, error } = await supabase
    .from('profiles')
    .select('wallet_address, username, campaign_level, total_vine_earned, highest_wave_survived')
    .order('campaign_level', { ascending: false })
    .order('highest_wave_survived', { ascending: false })
    .order('total_vine_earned', { ascending: false })
    .limit(50); // optional, or remove for full leaderboard

  if (error) {
    console.error('❌ Failed to fetch leaderboard:', error.message);
    return [];
  }

  return data || [];
}
