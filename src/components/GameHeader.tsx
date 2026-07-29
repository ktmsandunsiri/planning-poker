import { useState } from 'react';
import type { GameConfig, PlayingState } from '../types';
import { TASK_TYPES, DECK_LABELS } from '../constants';
import InviteModal from './InviteModal';

interface GameHeaderProps {
  gameConfig: GameConfig;
  gameState: PlayingState;
  roomId: string;
  onResetVotes: () => void;
  onNextRound: () => void;
  isOrganizer: boolean;
}

const GameHeader = ({ gameConfig, gameState, onResetVotes, onNextRound, isOrganizer }: GameHeaderProps) => {
  const [showInviteModal, setShowInviteModal] = useState(false);

  return (
    <>
      <header className="glass-header flex items-center justify-between px-6 py-4 sticky top-0 z-50">
        {/* Left: branding + game info */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.4)]">
            <i className="fa-solid fa-spade text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-white leading-tight">{gameConfig.name || 'Untitled Game'}</h2>
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium mt-0.5">
              <span className="bg-zinc-700/70 text-zinc-300 px-2 py-0.5 rounded-full">
                {DECK_LABELS[gameConfig.deck]}
              </span>
              <span className="bg-zinc-700/70 text-zinc-300 px-2 py-0.5 rounded-full">
                {TASK_TYPES[gameConfig.taskType]}
              </span>
            </div>
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-3">
          {/* Invite — always visible */}
          <button
            onClick={() => setShowInviteModal(true)}
            className="font-gaming flex items-center gap-2 bg-black text-white text-sm uppercase tracking-wider py-2 px-4 rounded-xl border border-zinc-700 shadow-[0_0_15px_rgba(0,0,0,0.8)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:border-indigo-400 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <i className="fa-solid fa-user-plus text-indigo-400" />
            Invite
          </button>

          {/* Reset Round — organizer only, during playing */}
          {gameState === 'playing' && isOrganizer && (
            <button
              onClick={onResetVotes}
              className="font-gaming flex items-center gap-2 bg-black text-white text-sm uppercase tracking-wider py-2 px-4 rounded-xl border border-zinc-700 shadow-[0_0_15px_rgba(0,0,0,0.8)] hover:shadow-[0_0_20px_rgba(251,113,133,0.3)] hover:border-rose-500 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <i className="fa-solid fa-eraser text-rose-400" />
              Reset
            </button>
          )}

          {/* Next Round — organizer only, during results */}
          {gameState === 'results' && isOrganizer && (
            <button
              onClick={onNextRound}
              className="font-gaming flex items-center gap-2 bg-black text-white text-sm uppercase tracking-wider py-2 px-4 rounded-xl border border-zinc-700 shadow-[0_0_15px_rgba(0,0,0,0.8)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:border-indigo-400 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              <i className="fa-solid fa-rotate-right text-indigo-400" />
              Next Round
            </button>
          )}
        </div>
      </header>

      {showInviteModal && <InviteModal onClose={() => setShowInviteModal(false)} />}
    </>
  );
};

export default GameHeader;
