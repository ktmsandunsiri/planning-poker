import type { GameConfig, Stats } from '../types';
import { NON_NUMERIC_DECKS } from '../constants';

interface ResultsSummaryProps {
  gameConfig: GameConfig;
  stats: Stats;
}

interface VoteCardProps {
  vote: string;
  color: 'blue' | 'purple';
}
const VoteCard = ({ vote, color }: VoteCardProps) => {
  const isQuestion = vote === '?';
  const colorClass = color === 'blue'
    ? 'bg-blue-900/60 text-blue-300 border-blue-800/50'
    : 'bg-purple-900/60 text-purple-300 border-purple-800/50';
  const questionClass = 'bg-zinc-700/60 text-zinc-400 border-zinc-600/50';
  return (
    <span className={`inline-flex w-8 h-10 border rounded-lg items-center justify-center font-bold text-xs ${isQuestion ? questionClass : colorClass}`}>
      {vote}
    </span>
  );
};

const ResultsSummary = ({ gameConfig, stats }: ResultsSummaryProps) => {
  const isNonNumeric = NON_NUMERIC_DECKS.includes(gameConfig.deck);

  const renderPanel = (type: 'dev' | 'qa') => {
    const s = stats[type];
    const color = type === 'dev' ? 'blue' : 'purple';
    const label = type === 'dev' ? 'Dev' : 'QA';
    const icon = type === 'dev' ? 'fa-code' : 'fa-bug';
    const iconColor = type === 'dev' ? 'text-blue-400' : 'text-purple-400';

    return (
      <div className="bg-zinc-800/80 backdrop-blur-sm rounded-3xl p-7 shadow-xl border border-zinc-700/60 flex-1 text-center">
        <p className="text-zinc-400 font-semibold mb-3 uppercase tracking-wide text-xs">
          <i className={`fa-solid ${icon} ${iconColor} mr-1.5`} />
          {label} {isNonNumeric ? 'Votes' : 'Average'}
        </p>

        {/* Average — only for numeric decks */}
        {!isNonNumeric && s.mean !== null && (
          <>
            <div className="text-6xl font-black text-white mb-1">{s.mean}</div>
            <p className="text-zinc-500 text-xs mb-4">{s.numericVotes?.length ?? 0} numeric votes</p>
          </>
        )}

        {/* T-shirt: no mean, just show a "reveal" message */}
        {isNonNumeric && (
          <div className="text-zinc-400 text-sm mb-4 italic">Votes revealed below</div>
        )}

        {/* Vote chips */}
        <div className="flex gap-1.5 justify-center flex-wrap">
          {s.rawVotes.map((v, i) => (
            <VoteCard key={i} vote={v} color={color} />
          ))}
          {s.rawVotes.length === 0 && (
            <span className="text-zinc-600 text-xs italic">No votes</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl px-6 mb-8 animate-slide-up flex gap-4 justify-center">
      {['DEV', 'BOTH'].includes(gameConfig.taskType) && renderPanel('dev')}
      {['QA',  'BOTH'].includes(gameConfig.taskType) && renderPanel('qa')}
    </div>
  );
};

export default ResultsSummary;
