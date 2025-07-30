// src/components/PublishSignatureHandler.tsx
import { useEffect } from 'react';
import { useSignMessage } from 'wagmi';

const PublishSignatureHandler = () => {
  const { signMessageAsync } = useSignMessage();

  useEffect(() => {
    const handlePublishRequest = async (e: any) => {
      const data = e.detail;

      try {
        const message = `DENG_DEFENSE_GAME_RESULTS:${data.wallet}:${data.gameId}:${data.mooEarned}:${data.levelBeat}:${data.wavesSurvived}:${data.enemiesKilled}:${data.livesRemaining}:${data.sessionToken}`;

        const publishsignature = await signMessageAsync({ message });
        console.log('Signature:', publishsignature);

        const res = await fetch('https://metadata-server-production.up.railway.app/api/publish-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, message, publishsignature }),
        });

        const result = await res.json();
        console.log('📡 Game results published:', result);
      } catch (error) {
        console.error('❌ Failed to publish game results', error);
      }
    };

    window.addEventListener('request-publish-game-results', handlePublishRequest);
    return () => window.removeEventListener('request-publish-game-results', handlePublishRequest);
  }, [signMessageAsync]);

  return null; // 🫥 Invisible component
};

export default PublishSignatureHandler;
