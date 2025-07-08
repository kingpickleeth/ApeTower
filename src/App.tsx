import './App.css';
import GameCanvas from './components/GameCanvas';

function App() {
  return (
    <div id="game-wrapper">
      <h1 id="game-title">🧠 Ape Tower</h1>
      <div id="game-frame">
        <GameCanvas /> {/* ✅ Mounts Phaser into #game-container */}
      </div>
    </div>
  );
}

export default App;
