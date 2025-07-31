import React, { useEffect, useState } from 'react';
import { getLeaderboard } from '../utils/getLeaderboard';
import './LeaderboardModal.css';

type LeaderboardModalProps = {
  onClose: () => void;
};

export default function LeaderboardModal({ onClose }: LeaderboardModalProps) {
  const [leaders, setLeaders] = useState<any[]>([]);

  useEffect(() => {
    getLeaderboard().then(setLeaders);
  }, []);

  return (
    <div className="leaderboard-overlay">
      <div className="leaderboard-modal">
        <h2 className="leaderboard-title">🏆 Deng Defense Leaderboard 🏆</h2>

        <div className="leaderboard-table-header">
          <div>#</div>
          <div>Player</div>
          <div>Level</div>
          <div>Wave</div>
          <div>$MOO</div>
        </div>

        <div className="leaderboard-table-body">
          {leaders.map((row, idx) => (
            <div className="leaderboard-row" key={row.wallet_address}>
              <div>#{idx + 1}</div>
              <div>{row.username || row.wallet_address.slice(0, 6)}</div>
              <div>{row.campaign_level}</div>
              <div>{row.highest_wave_survived}</div>
              <div>{Number(row.total_vine_earned).toFixed(0)}</div>
            </div>
          ))}
        </div>

        <button className="glow-button danger leaderboard-close-btn" onClick={onClose}>❌ Close</button>
      </div>
    </div>
  );
}
