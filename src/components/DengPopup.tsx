import React, { useEffect, useState } from 'react';
import './DengPopup.css';

const dengImages = [
  'https://dengdefense.xyz/images/deng1.png',
  'https://dengdefense.xyz/images/deng2.png',
  'https://dengdefense.xyz/images/deng3.png',
  'https://dengdefense.xyz/images/deng4.png',
  'https://dengdefense.xyz/images/deng5.png',
  'https://dengdefense.xyz/images/deng6.png',
  'https://dengdefense.xyz/images/deng7.png',
  'https://dengdefense.xyz/images/deng8.png',
  'https://dengdefense.xyz/images/deng9.png',
  'https://dengdefense.xyz/images/deng10.png',
];

const messages = [
  "✨ Your aura says you need a Deng.",
  "🐸 A wild Deng appeared!",
  "🎯 You’re missing one important thing: a Deng!",
  "💚 Be Better. Get a Deng.",
  "👀 You're being watched… by a Deng.",
  "🧃 No Deng? That’s a tragedy.",
  "🪙 What's better than $MOO? A Deng!",
  "📦 Your inventory is missing: 1 Deng",
  "😎 Cool people own Dengs. Just sayin.",
  "🔮 The prophecy foretold you’d buy a Deng.",
  // (add more as you like)
];

export default function DengPopup({ walletHasDeng }: { walletHasDeng: boolean }) {
  const [show, setShow] = useState(false);
  const [img, setImg] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (walletHasDeng) return;

    let interval: NodeJS.Timeout;
    let timeout: NodeJS.Timeout;

    const cyclePopup = () => {
      setImg(dengImages[Math.floor(Math.random() * dengImages.length)]);
      setMessage(messages[Math.floor(Math.random() * messages.length)]);
      setShow(true);

      timeout = setTimeout(() => setShow(false), 15000); // 👈 Show for 15s
    };

    cyclePopup(); // First show immediately

    interval = setInterval(() => {
      cyclePopup(); // every 30s: 15s show + 15s hide
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [walletHasDeng]);

  if (!show || walletHasDeng) return null;

  return (
    <div className="deng-popup bottom-left">
      <img src={img} alt="Deng" className="deng-img-big" />
      <div className="deng-message">
        <div className="deng-text">{message}</div>
        <button
          className="glow-button"
          onClick={() =>
            window.open('https://magiceden.us/collections/apechain/0x2cf92fe634909a9cf5e41291f54e5784d234cf8d', '_blank')
          }
        >
          Get a Deng →
        </button>
      </div>
    </div>
  );
}
