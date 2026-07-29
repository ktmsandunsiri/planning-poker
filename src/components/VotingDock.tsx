import type { GameConfig } from '../types';

interface VotingDockProps {
  gameConfig: GameConfig;
  currentDeck: string[];
  myVoteDev: string | null;
  myVoteQa: string | null;
  onVote: (type: 'dev' | 'qa', value: string) => void;
}

const VotingDock = ({ gameConfig, currentDeck, myVoteDev, myVoteQa, onVote }: VotingDockProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 glass-dock border-t border-zinc-700/60 px-4 pt-3 pb-4 flex flex-col items-center z-50">

      {/* DEV Deck */}
      {['DEV', 'BOTH'].includes(gameConfig.taskType) && (
        <div className="w-full max-w-6xl mb-3">
          <div className="flex items-center mb-2">
            <div className="h-px bg-zinc-700 flex-1" />
            <span className="px-3 text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-950/60 py-0.5 rounded-full border border-blue-800/50">
              Dev Estimation
            </span>
            <div className="h-px bg-zinc-700 flex-1" />
          </div>
          <div className="flex overflow-x-auto gap-1.5 pb-1 scrollbar-hide justify-center">
            {currentDeck.map((val, idx) => {
              const isQuestion = val === '?';
              const isSelected = myVoteDev === val;
              return (
                <button
                  key={`dev-${val}`}
                  onClick={() => onVote('dev', val)}
                  style={{ animationDelay: `${idx * 15}ms` }}
                  className={`poker-card animate-slide-up flex-shrink-0 w-10 h-14 rounded-xl border-2 bg-zinc-800 flex items-center justify-center font-bold transition-all
                    ${isSelected
                      ? isQuestion
                        ? 'bg-zinc-600 text-white border-zinc-400 shadow-[0_8px_20px_-4px_rgba(100,100,120,0.6)] -translate-y-2'
                        : 'selected border-blue-500'
                      : isQuestion
                        ? 'border-zinc-500 text-zinc-300 hover:border-zinc-300 text-base'
                        : 'border-zinc-600 text-zinc-200 hover:border-blue-400 text-sm'
                    }`}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* QA Deck */}
      {['QA', 'BOTH'].includes(gameConfig.taskType) && (
        <div className="w-full max-w-6xl">
          <div className="flex items-center mb-2">
            <div className="h-px bg-zinc-700 flex-1" />
            <span className="px-3 text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-950/60 py-0.5 rounded-full border border-purple-800/50">
              QA Estimation
            </span>
            <div className="h-px bg-zinc-700 flex-1" />
          </div>
          <div className="flex overflow-x-auto gap-1.5 pb-1 scrollbar-hide justify-center">
            {currentDeck.map((val, idx) => {
              const isQuestion = val === '?';
              const isSelected = myVoteQa === val;
              return (
                <button
                  key={`qa-${val}`}
                  onClick={() => onVote('qa', val)}
                  style={{ animationDelay: `${idx * 15}ms` }}
                  className={`poker-card animate-slide-up flex-shrink-0 w-10 h-14 rounded-xl border-2 bg-zinc-800 flex items-center justify-center font-bold transition-all
                    ${isSelected
                      ? isQuestion
                        ? 'bg-zinc-600 text-white border-zinc-400 shadow-[0_8px_20px_-4px_rgba(100,100,120,0.6)] -translate-y-2'
                        : 'bg-purple-600 text-white border-purple-500 shadow-[0_8px_20px_-4px_rgba(147,51,234,0.6)] -translate-y-2'
                      : isQuestion
                        ? 'border-zinc-500 text-zinc-300 hover:border-zinc-300 text-base'
                        : 'border-zinc-600 text-zinc-200 hover:border-purple-400 text-sm'
                    }`}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default VotingDock;
