import type { GameConfig, TaskTypeKey } from '../types';
import { TASK_TYPES } from '../constants';

interface VotingDockProps {
  gameConfig: GameConfig;
  currentDeck: string[];
  myVoteDev: string | null;
  myVoteQa: string | null;
  onVote: (type: 'dev' | 'qa', value: string) => void;
  /** Organizer-only: called when the estimation type toggle changes */
  onTaskTypeChange?: (type: TaskTypeKey) => void;
  isOrganizer: boolean;
  /** True when at least one player has voted — disables task-type toggles */
  anyVoteCast: boolean;
}

const VotingDock = ({
  gameConfig,
  currentDeck,
  myVoteDev,
  myVoteQa,
  onVote,
  onTaskTypeChange,
  isOrganizer,
  anyVoteCast,
}: VotingDockProps) => {

  const taskTypeKeys = Object.keys(TASK_TYPES) as TaskTypeKey[];

  return (
    <div className="fixed bottom-0 left-0 right-0 glass-dock border-t border-zinc-700/60 px-4 pt-3 pb-4 z-50">
      <div className="flex items-start gap-4 max-w-7xl mx-auto w-full">

        {/* ── LEFT: Estimation Type Panel (organizer only) ─────────────────── */}
        {isOrganizer && (
          <div className="flex-shrink-0 w-36 flex flex-col gap-1.5 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1 text-center">
              Est. Type
            </p>
            {taskTypeKeys.map((key) => {
              const isActive = gameConfig.taskType === key;
              const isDisabled = anyVoteCast && !isActive;
              return (
                <button
                  key={key}
                  disabled={isDisabled}
                  onClick={() => !isDisabled && onTaskTypeChange?.(key)}
                  title={
                    isDisabled
                      ? 'Reset votes before changing estimation type'
                      : TASK_TYPES[key]
                  }
                  className={`w-full py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-center
                    ${isActive
                      ? 'bg-indigo-700/60 border-indigo-500 text-indigo-200 shadow-[0_0_10px_rgba(99,102,241,0.25)]'
                      : isDisabled
                        ? 'bg-zinc-900/50 border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 cursor-pointer'
                    }`}
                >
                  {TASK_TYPES[key]}
                </button>
              );
            })}
            {anyVoteCast && (
              <p className="text-[9px] text-rose-400/80 text-center mt-0.5 leading-tight">
                Reset to change
              </p>
            )}
          </div>
        )}

        {/* ── RIGHT: Card Rows ──────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">

          {/* DEV Deck */}
          {['DEV', 'BOTH'].includes(gameConfig.taskType) && (
            <div className="w-full">
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
            <div className="w-full">
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
      </div>
    </div>
  );
};

export default VotingDock;
