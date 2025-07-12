import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { walletAddress } = req.body;

  const { error } = await supabase
    .from('profiles')
    .update({ total_vine: 0 })
    .eq('wallet_address', walletAddress);

  if (error) {
    return res.status(500).json({ error });
  }

  return res.status(200).json({ message: 'VINE balance reset' });
}
