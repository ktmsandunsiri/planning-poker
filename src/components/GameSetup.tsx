import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GameConfig, TaskTypeKey, DeckKey } from '../types';
import { TASK_TYPES, DECK_LABELS } from '../constants';
import { supabase } from '../lib/supabase';
import { saveSession } from '../lib/session';

/** Consistent DiceBear avatar URL */
const avatarUrl = (name: string) =>
  `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

type CreateState = 'idle' | 'loading' | 'error';

const ALL_DECKS: DeckKey[] = ['DAYS', 'HOURS', 'STORY', 'POWERS', 'TSHIRT'];

const GameSetup = () => {
  const navigate = useNavigate();
  const [createState, setCreateState] = useState<CreateState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const [organizerName, setOrganizerName] = useState('');
  const [gameConfig, setGameConfig] = useState<Omit<GameConfig, 'id'>>({
    name: '',
    deck: 'STORY',
    taskType: 'BOTH',
  });

  const handleCreateGame = async () => {
    if (!organizerName.trim()) return;
    setCreateState('loading');
    setErrorMsg('');

    let roomId: string;

    if (supabase) {
      const { data, error } = await supabase
        .from('games')
        .insert({
          name: gameConfig.name || 'Untitled Game',
          deck: gameConfig.deck,
          task_type: gameConfig.taskType,
        })
        .select('id')
        .single();

      if (error || !data?.id) {
        console.error('[GameSetup] Failed to create game:', error);
        setErrorMsg(
          error?.message ??
          'Could not create game. Check your Supabase connection and make sure the games table exists.'
        );
        setCreateState('error');
        return;
      }
      roomId = data.id as string;
    } else {
      roomId = crypto.randomUUID();
    }

    const playerId = crypto.randomUUID();
    saveSession(roomId, {
      playerId,
      playerName: organizerName.trim(),
      playerAvatar: avatarUrl(organizerName.trim()),
      isOrganizer: true,
    });

    navigate(`/game/${roomId}`);
  };

  const canCreate = organizerName.trim().length > 0 && createState !== 'loading';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-xl bg-zinc-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 animate-pop-in border border-zinc-700 relative z-10">
        <h2 className="text-3xl font-bold mb-8 text-white text-center">Set up your game</h2>

        <div className="space-y-6">
          {/* Organizer Name */}
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">
              Your Name <span className="text-indigo-400">*</span>
            </label>
            <input
              type="text"
              autoFocus
              maxLength={30}
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-zinc-500"
              placeholder="e.g. Jordan (Scrum Master)"
              value={organizerName}
              onChange={(e) => setOrganizerName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateGame()}
            />
          </div>

          {/* Game Name */}
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">Game Name</label>
            <input
              type="text"
              maxLength={60}
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-zinc-500"
              placeholder="e.g. Sprint 42 Planning"
              value={gameConfig.name}
              onChange={(e) => setGameConfig({ ...gameConfig, name: e.target.value })}
            />
          </div>

          {/* Deck */}
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">Deck</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ALL_DECKS.map((key) => (
                <button
                  key={key}
                  onClick={() => setGameConfig({ ...gameConfig, deck: key })}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all text-left ${
                    gameConfig.deck === key
                      ? 'bg-indigo-900/50 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  {DECK_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          {/* Task Estimation Type */}
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">Task Estimation Type</label>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(TASK_TYPES) as TaskTypeKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setGameConfig({ ...gameConfig, taskType: key })}
                  className={`py-3 px-2 rounded-xl font-medium border text-sm transition-all ${
                    gameConfig.taskType === key
                      ? 'bg-indigo-900/50 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  {TASK_TYPES[key]}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {createState === 'error' && (
            <div className="flex items-start gap-3 bg-red-950/60 border border-red-800/60 rounded-xl p-4">
              <i className="fa-solid fa-triangle-exclamation text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">{errorMsg}</p>
            </div>
          )}

          {/* Submit */}
          <div className="pt-6 border-t border-zinc-700">
            <button
              onClick={handleCreateGame}
              disabled={!canCreate}
              className="w-full font-gaming bg-black text-white py-4 px-6 rounded-2xl text-lg uppercase tracking-wider border border-zinc-700 shadow-[0_0_20px_rgba(0,0,0,0.8)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:border-indigo-400 transition-all duration-300 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              {createState === 'loading' ? (
                <>
                  <i className="fa-solid fa-circle-notch animate-spin text-indigo-400" />
                  Creating…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-play text-indigo-400" />
                  Create game
                </>
              )}
            </button>
            {!organizerName.trim() && createState === 'idle' && (
              <p className="text-xs text-zinc-500 text-center mt-3">Enter your name to continue</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameSetup;
