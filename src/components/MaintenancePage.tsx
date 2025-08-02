import React, { useState, useEffect } from 'react';
import './MaintenancePage.css'; // Add styling to this file

const MaintenancePage = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prevProgress) => (prevProgress < 100 ? prevProgress + 2 : 100));
    }, 100);

    return () => clearInterval(interval); // Clean up the interval when component is unmounted
  }, []);

  const handleTowerClick = () => {
    alert('Tower clicked!'); // Customize interaction with your game assets
  };

  return (
    <div className="maintenance-container">
      {/* Dynamic Background */}
      <div className="background"></div>

      <div className="content">
        <h1>DENG DEFENSE</h1>
        <h2>THE DEFENSE IS UNDER CONSTRUCTION!</h2>
        <p>We're working hard to make the game better. Check back soon!</p>

        {/* Progress Bar */}
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}></div>
        </div>

        {/* Interactive Tower */}
        <div className="interactive-tower" onClick={handleTowerClick}></div>

        {/* Footer Section */}
        <footer>
          <p>Stay updated:</p>
          <a href="https://discord.com" target="_blank" rel="noopener noreferrer">
            Join our Discord
          </a>
        </footer>
      </div>
    </div>
  );
};

export default MaintenancePage;
