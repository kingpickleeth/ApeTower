import './App.css';
import GameCanvas from './components/GameCanvas';

function App() {
  return (
    <>
      
      <div id="game-wrapper">
        <div id="game-content">
          <h1 id="game-title">🧠 Ape Tower</h1>
          <div id="game-frame">
            <GameCanvas />
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
