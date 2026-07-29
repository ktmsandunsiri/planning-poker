import type { Player, GameConfig, PlayingState } from '../types';

interface GameBoardProps {
  players: Player[];
  gameState: PlayingState;
  gameConfig: GameConfig;
  onReveal: () => void;
  onResetVotes: () => void;
  onNextRound: () => void;
  isHighDeviation: (vote: string | null, type: 'dev' | 'qa') => boolean;
  isOrganizer: boolean;
}

const GameBoard = ({
  players,
  gameState,
  gameConfig,
  onReveal,
  onResetVotes,
  onNextRound,
  isHighDeviation,
  isOrganizer,
}: GameBoardProps) => {
  return (
    <div className="relative w-full max-w-5xl h-[440px] flex items-center justify-center mt-8 mb-8">
      {/* Table Graphic */}
      <div className="absolute w-[80%] h-[70%] poker-table rounded-full z-0 flex flex-col items-center justify-center gap-3">

        {/* ── Playing state ── */}
        {gameState === 'playing' && isOrganizer && (
          <>
            <button
              onClick={onReveal}
              className="z-10 font-gaming bg-black text-white py-3.5 px-8 rounded-2xl text-base uppercase tracking-wider border border-zinc-700 shadow-[0_0_20px_rgba(0,0,0,0.8)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:border-indigo-400 transition-all duration-300 hover:scale-110 active:scale-95 flex items-center gap-3"
            >
              <i className="fa-solid fa-eye text-indigo-400" />
              Reveal cards
            </button>
            <button
              onClick={onResetVotes}
              className="z-10 font-gaming bg-transparent text-zinc-400 py-1.5 px-5 rounded-xl text-xs uppercase tracking-wider border border-zinc-700/60 hover:border-rose-600 hover:text-rose-400 transition-all duration-200 flex items-center gap-2"
            >
              <i className="fa-solid fa-eraser text-xs" />
              Reset Votes
            </button>
          </>
        )}
        {gameState === 'playing' && !isOrganizer && (
          <div className="text-center">
            <p className="text-zinc-300 font-semibold text-sm">Waiting for organizer to reveal…</p>
          </div>
        )}

        {/* ── Results state ── */}
        {gameState === 'results' && (
          <div className="text-center flex flex-col items-center gap-3">
            <div>
              <h3 className="text-xl font-bold text-emerald-300 mb-0.5 drop-shadow-lg">Voting Complete</h3>
              <p className="text-emerald-400/70 font-medium text-sm">Review the estimates above</p>
            </div>
            {isOrganizer && (
              <button
                onClick={onNextRound}
                className="z-10 font-gaming bg-black text-white py-2.5 px-7 rounded-xl text-sm uppercase tracking-wider border border-zinc-700 shadow-[0_0_15px_rgba(0,0,0,0.8)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] hover:border-indigo-400 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <i className="fa-solid fa-rotate-right text-indigo-400" />
                Next Round
              </button>
            )}
          </div>
        )}

        {/* ── Countdown state ── */}
        {gameState === 'countdown' && (
          <div className="text-center">
            <p className="text-zinc-300 font-semibold text-sm">Revealing cards…</p>
          </div>
        )}
      </div>

      {/* Avatars arranged around table */}
      {players.map((player, index) => {
        const total = players.length;
        const angle = (index / total) * Math.PI * 2;
        const rx = 350;
        const ry = 175;
        const left = `calc(50% + ${Math.cos(angle) * rx}px)`;
        const top  = `calc(50% + ${Math.sin(angle) * ry}px)`;

        return (
          <div
            key={player.id}
            className="absolute z-20 flex flex-col items-center transform -translate-x-1/2 -translate-y-1/2"
            style={{ left, top }}
          >
            {/* Vote cards or card backs */}
            {gameState === 'results' ? (
              <div className="flex gap-1 mb-2 animate-pop-in">
                {['DEV', 'BOTH'].includes(gameConfig.taskType) && (() => {
                  const v = player.voteDev;
                  const isQ = v === '?';
                  const highDev = isHighDeviation(v, 'dev');
                  return (
                    <div
                      className={`w-10 h-14 rounded-lg flex items-center justify-center font-bold shadow-md relative text-sm
                        ${isQ ? 'bg-zinc-600 text-zinc-300' : 'bg-blue-600 text-white'}
                        ${highDev ? 'ring-4 ring-red-400 ring-offset-1 ring-offset-zinc-900' : ''}`}
                    >
                      {v !== null ? v : '–'}
                      {highDev && (
                        <i className="fa-solid fa-exclamation-circle absolute -top-2.5 -right-2.5 text-red-500 bg-zinc-900 rounded-full text-xs" />
                      )}
                    </div>
                  );
                })()}
                {['QA', 'BOTH'].includes(gameConfig.taskType) && (() => {
                  const v = player.voteQa;
                  const isQ = v === '?';
                  const highDev = isHighDeviation(v, 'qa');
                  return (
                    <div
                      className={`w-10 h-14 rounded-lg flex items-center justify-center font-bold shadow-md relative text-sm
                        ${isQ ? 'bg-zinc-600 text-zinc-300' : 'bg-purple-600 text-white'}
                        ${highDev ? 'ring-4 ring-red-400 ring-offset-1 ring-offset-zinc-900' : ''}`}
                    >
                      {v !== null ? v : '–'}
                      {highDev && (
                        <i className="fa-solid fa-exclamation-circle absolute -top-2.5 -right-2.5 text-red-500 bg-zinc-900 rounded-full text-xs" />
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="mb-2 h-14 flex items-end">
                {player.hasVoted ? (
                  <div className="w-10 h-14 bg-blue-500 rounded-lg border-2 border-blue-300/30 shadow-[0_0_12px_rgba(59,130,246,0.4)] flex items-center justify-center animate-slide-up">
                    <i className="fa-solid fa-check text-blue-200 text-xs" />
                  </div>
                ) : (
                  <div className="w-10 h-14 bg-zinc-700/50 rounded-lg border-2 border-dashed border-zinc-600 opacity-60" />
                )}
              </div>
            )}

            {/* Avatar */}
            <img
              src={player.avatar}
              alt={player.name}
              className="w-12 h-12 rounded-full border-2 border-zinc-600 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
            />
            {/* Name tag */}
            <span className="text-xs font-bold text-zinc-100 mt-1 bg-zinc-800/90 px-2 py-0.5 rounded-full border border-zinc-700/50 whitespace-nowrap max-w-[80px] truncate">
              {player.name}
              {player.isOrganizer && (
                <i className="fa-solid fa-crown text-amber-400 ml-1 text-[9px]" title="Organizer" />
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default GameBoard;
