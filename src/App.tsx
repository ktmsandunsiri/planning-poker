import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import LandingPage from './components/LandingPage';
import GameSetup from './components/GameSetup';
import GameRoom from './pages/GameRoom';

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/setup" element={<GameSetup />} />
      <Route path="/game/:roomId" element={<GameRoom />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
