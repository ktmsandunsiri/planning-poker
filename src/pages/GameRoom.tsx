import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';

import type { Player, GameConfig, Stats, PlayingState, DeckKey, TaskTypeKey } from '../types';
import { DECKS, NON_NUMERIC_DECKS, voteToNumber } from '../constants';
import { supabase } from '../lib/supabase';
import { loadSession, saveSession } from '../lib/session';
import { useGameRoom } from '../hooks/useGameRoom';

import GameHeader from '../components/GameHeader';
import GameBoard from '../components/GameBoard';
import VotingDock from '../components/VotingDock';
import ResultsSummary from '../components/ResultsSummary';
import CountdownOverlay from '../components/CountdownOverlay';
import JoinScreen from '../components/JoinScreen';

const makeAvatar = (name: string) =>
  `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

const LoadingSkeleton = () => (
  <div className="flex flex-col h-screen bg-zinc-900 items-center justify-center gap-6">
    <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.4)] animate-pulse">
      <i className="fa-solid fa-spade text-white text-3xl" />
    </div>
    <p className="text-zinc-400 text-sm font-medium animate-pulse">Loading game room…</p>
  </div>
);

const ErrorScreen = ({ message }: { message: string }) => (
  <div className="flex flex-col h-screen bg-zinc-900 items-center justify-center gap-4 p-6">
    <div className="w-14 h-14 bg-red-950/60 border border-red-800/50 rounded-2xl flex items-center justify-center">
      <i className="fa-solid fa-triangle-exclamation text-red-400 text-2xl" />
    </div>
    <h2 className="text-xl font-bold text-white">Room not found</h2>
    <p className="text-zinc-400 text-sm text-center max-w-sm">{message}</p>
    <a href="/" className="mt-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium underline underline-offset-4">
      Go back to home
    </a>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────

const GameRoom = () => {
  const { roomId = '' } = useParams<{ roomId: string }>();

  // ── Game config ──────────────────────────────────────────────────────────
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError,   setConfigError]   = useState('');

  useEffect(() => {
    if (!roomId) return;
    if (!supabase) {
      setConfigError('Supabase is not configured. Add your credentials to .env.local to enable multiplayer.');
      setConfigLoading(false);
      return;
    }
    supabase
      .from('games')
      .select('id, name, deck, task_type')
      .eq('id', roomId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setConfigError('This game room does not exist or has been deleted.');
        } else {
          setGameConfig({
            id:       data.id as string,
            name:     (data.name as string)          || 'Untitled Game',
            deck:     (data.deck as DeckKey)         || 'DAYS',
            taskType: (data.task_type as TaskTypeKey) || 'BOTH',
          });
        }
        setConfigLoading(false);
      });
  }, [roomId]);

  // ── Player (single source of truth — no separate myVoteDev/myVoteQa) ─────
  // RATIONALE: Having voteDev and voteQa in BOTH a separate state variable AND
  // inside myPlayer creates two sources of truth. When handleVote is called for
  // QA after Dev, the closure over the separate myVoteDev state may be stale
  // (still null) if React hasn't committed the previous render yet. Using ONLY
  // myPlayer and functional updates (setMyPlayer(prev => ...)) means every vote
  // always reads from the *latest committed* player object, eliminating the race.

  const restoredSession = useMemo(() => loadSession(roomId), [roomId]);

  const makePlayer = useCallback(
    (s: { playerId: string; playerName: string; playerAvatar: string; isOrganizer: boolean }): Player => ({
      id: s.playerId, name: s.playerName, avatar: s.playerAvatar,
      hasVoted: false, voteDev: null, voteQa: null, isOrganizer: s.isOrganizer,
    }),
    []
  );

  const [myPlayer, setMyPlayer] = useState<Player | null>(
    restoredSession ? makePlayer(restoredSession) : null
  );

  // ── Game state ────────────────────────────────────────────────────────────
  const [localGameState, setLocalGameState] = useState<PlayingState>('playing');
  const [countdown,      setCountdown]      = useState(5);

  // ── Realtime hook ─────────────────────────────────────────────────────────
  const stablePlayerId = myPlayer?.id ?? null;
  const {
    players,
    revealTick,
    nextRoundTick,
    resetVotesTick,
    remoteTaskType,
    trackPlayer,
    broadcastReveal,
    broadcastNextRound,
    broadcastResetVotes,
    broadcastTaskType,
  } = useGameRoom(roomId, stablePlayerId);

  // ── Canonical presence tracker ────────────────────────────────────────────
  // trackPlayer is the ONLY place we call channel.track().
  // It is intentionally NOT called inside setMyPlayer updaters (side-effect
  // anti-pattern). Every myPlayer state change flows through here.
  useEffect(() => {
    if (myPlayer) trackPlayer(myPlayer);
  }, [myPlayer, trackPlayer]);

  // ── Remote task-type sync (non-organizer) ────────────────────────────────
  useEffect(() => {
    if (!remoteTaskType || !gameConfig) return;
    if (remoteTaskType === gameConfig.taskType) return;
    setGameConfig(prev => prev ? { ...prev, taskType: remoteTaskType } : prev);
  }, [remoteTaskType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── clearMyVotes ──────────────────────────────────────────────────────────
  // Uses a functional update so it never reads stale closure state.
  // Does NOT call trackPlayer — the useEffect([myPlayer]) handles that.
  const clearMyVotes = useCallback(() => {
    setMyPlayer(prev => {
      if (!prev) return prev;
      const cleared: Player = { ...prev, hasVoted: false, voteDev: null, voteQa: null };
      saveSession(roomId, {
        playerId:     cleared.id,
        playerName:   cleared.name,
        playerAvatar: cleared.avatar,
        isOrganizer:  cleared.isOrganizer,
      });
      return cleared;
    });
  }, [roomId]);

  // ── TICK: reveal ──────────────────────────────────────────────────────────
  const prevRevealRef = useRef(0);
  useEffect(() => {
    if (revealTick <= prevRevealRef.current) return;
    prevRevealRef.current = revealTick;
    try {
      if (localGameState === 'playing') {
        setLocalGameState('countdown');
        setCountdown(5);
      }
    } catch (err) {
      console.error('[GameRoom] reveal tick error:', err);
    }
  }, [revealTick, localGameState]);

  // ── TICK: next_round ──────────────────────────────────────────────────────
  const prevNextRoundRef = useRef(0);
  useEffect(() => {
    if (nextRoundTick <= prevNextRoundRef.current) return;
    prevNextRoundRef.current = nextRoundTick;
    try {
      setLocalGameState('playing');
      clearMyVotes();
    } catch (err) {
      console.error('[GameRoom] next_round tick error:', err);
    }
  }, [nextRoundTick, clearMyVotes]);

  // ── TICK: reset_votes ─────────────────────────────────────────────────────
  const prevResetRef = useRef(0);
  useEffect(() => {
    if (resetVotesTick <= prevResetRef.current) return;
    prevResetRef.current = resetVotesTick;
    try {
      clearMyVotes();
    } catch (err) {
      console.error('[GameRoom] reset_votes tick error:', err);
    }
  }, [resetVotesTick, clearMyVotes]);

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (localGameState === 'countdown' && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (localGameState === 'countdown' && countdown === 0) {
      setLocalGameState('results');
    }
    return () => clearTimeout(timer);
  }, [localGameState, countdown]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo<Stats | null>(() => {
    if (localGameState !== 'results' || !gameConfig) return null;
    const isNonNumeric = NON_NUMERIC_DECKS.includes(gameConfig.deck);

    const calculateFor = (type: 'dev' | 'qa'): Stats['dev'] => {
      const rawVotes = players
        .map(p => type === 'dev' ? p.voteDev : p.voteQa)
        .filter((v): v is string => v !== null);
      if (isNonNumeric) return { mean: null, stdDev: null, rawVotes, numericVotes: null };
      const numericVotes = rawVotes.map(voteToNumber).filter((v): v is number => v !== null);
      if (numericVotes.length === 0) return { mean: null, stdDev: null, rawVotes, numericVotes: [] };
      const mean     = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;
      const variance = numericVotes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numericVotes.length;
      return { mean: parseFloat(mean.toFixed(1)), stdDev: Math.sqrt(variance), rawVotes, numericVotes };
    };
    return { dev: calculateFor('dev'), qa: calculateFor('qa') };
  }, [localGameState, players, gameConfig]);

  const isHighDeviation = useCallback((vote: string | null, type: 'dev' | 'qa'): boolean => {
    if (!vote || vote === '?' || !stats || !gameConfig) return false;
    if (NON_NUMERIC_DECKS.includes(gameConfig.deck)) return false;
    const s = stats[type];
    if (s.mean === null || s.stdDev === null || s.stdDev === 0) return false;
    const n = voteToNumber(vote);
    return n !== null && Math.abs(n - s.mean) > s.stdDev;
  }, [stats, gameConfig]);

  // ── Event handlers ────────────────────────────────────────────────────────

  const handleJoin = useCallback((name: string) => {
    const newPlayer: Player = {
      id: crypto.randomUUID(), name: name.trim(), avatar: makeAvatar(name.trim()),
      hasVoted: false, voteDev: null, voteQa: null, isOrganizer: false,
    };
    saveSession(roomId, {
      playerId: newPlayer.id, playerName: newPlayer.name,
      playerAvatar: newPlayer.avatar, isOrganizer: false,
    });
    setMyPlayer(newPlayer);
  }, [roomId]);

  /**
   * handleVote — stale-closure-safe via functional setMyPlayer.
   *
   * WHY FUNCTIONAL UPDATE:
   *   In Dev+QA mode the user clicks Dev then QA. If we computed newVoteDev from
   *   a separate `myVoteDev` state variable, the QA click's closure would still
   *   see `myVoteDev = null` (the pre-Dev-click render) if React hasn't fully
   *   committed the previous render when the QA click fires.
   *   
   *   By reading `prev.voteDev` and `prev.voteQa` inside `setMyPlayer(prev => ...)`,
   *   React guarantees we always see the *latest committed* state, eliminating
   *   the race condition and the silent vote-overwrite in BOTH mode.
   */
  const handleVote = useCallback((type: 'dev' | 'qa', value: string) => {
    if (!gameConfig) return;
    try {
      setMyPlayer(prev => {
        if (!prev) return prev;

        // Read current votes from prev (guaranteed fresh) not from closure state
        const newVoteDev = type === 'dev' ? (prev.voteDev === value ? null : value) : prev.voteDev;
        const newVoteQa  = type === 'qa'  ? (prev.voteQa  === value ? null : value) : prev.voteQa;

        let hasVoted = false;
        if (gameConfig.taskType === 'DEV'  && newVoteDev !== null) hasVoted = true;
        if (gameConfig.taskType === 'QA'   && newVoteQa  !== null) hasVoted = true;
        if (gameConfig.taskType === 'BOTH' && (newVoteDev !== null || newVoteQa !== null)) hasVoted = true;

        const updated: Player = { ...prev, voteDev: newVoteDev, voteQa: newVoteQa, hasVoted };

        // localStorage is synchronous — safe inside a state updater
        saveSession(roomId, {
          playerId:     updated.id,
          playerName:   updated.name,
          playerAvatar: updated.avatar,
          isOrganizer:  updated.isOrganizer,
        });

        return updated;
      });
    } catch (err) {
      console.error('[GameRoom] handleVote error:', err);
    }
  }, [gameConfig, roomId]);

  const handleTaskTypeChange = useCallback(async (newType: TaskTypeKey) => {
    if (!gameConfig) return;
    try {
      setGameConfig(prev => prev ? { ...prev, taskType: newType } : prev);
      broadcastTaskType(newType);
      if (supabase) {
        await supabase.from('games').update({ task_type: newType }).eq('id', roomId);
      }
    } catch (err) {
      console.error('[GameRoom] handleTaskTypeChange error:', err);
    }
  }, [gameConfig, roomId, broadcastTaskType]);

  const handleReveal = useCallback(() => {
    try { broadcastReveal(); }
    catch (err) { console.error('[GameRoom] handleReveal error:', err); }
  }, [broadcastReveal]);

  const handleNextRound = useCallback(() => {
    try { broadcastNextRound(); }
    catch (err) { console.error('[GameRoom] handleNextRound error:', err); }
  }, [broadcastNextRound]);

  const handleReset = useCallback(() => {
    try { broadcastResetVotes(); }
    catch (err) { console.error('[GameRoom] handleReset error:', err); }
  }, [broadcastResetVotes]);

  // ── Render guards ─────────────────────────────────────────────────────────

  if (configLoading) return <LoadingSkeleton />;
  if (configError || !gameConfig) return <ErrorScreen message={configError} />;

  const currentDeck  = DECKS[gameConfig.deck];
  const isOrganizer  = myPlayer?.isOrganizer ?? false;
  const needsToJoin  = myPlayer === null;

  // anyVoteCast: read from myPlayer directly (single source of truth).
  // Also include other players' presence so the panel locks when teammates vote.
  // Using myPlayer.hasVoted (not a separate state variable) means this updates
  // atomically with the vote itself — no stale-state lag.
  const anyVoteCast =
    (myPlayer?.hasVoted === true) ||
    players.some(p => p.hasVoted && p.id !== myPlayer?.id);

  const bottomPad = gameConfig.taskType === 'BOTH' ? '22rem' : '14rem';

  return (
    <div className="flex flex-col h-screen bg-zinc-900">
      <GameHeader
        gameConfig={gameConfig}
        gameState={localGameState}
        roomId={roomId}
        isOrganizer={isOrganizer}
      />

      {needsToJoin ? (
        <JoinScreen onJoin={handleJoin} />
      ) : (
        <>
          <main
            className="flex-1 overflow-y-auto relative flex flex-col items-center justify-center"
            style={{ paddingBottom: bottomPad }}
          >
            {localGameState === 'countdown' && <CountdownOverlay countdown={countdown} />}

            {localGameState === 'results' && stats && (
              <ResultsSummary gameConfig={gameConfig} stats={stats} />
            )}

            <GameBoard
              players={players}
              gameState={localGameState}
              gameConfig={gameConfig}
              onReveal={handleReveal}
              onResetVotes={handleReset}
              onNextRound={handleNextRound}
              isHighDeviation={isHighDeviation}
              isOrganizer={isOrganizer}
            />
          </main>

          {localGameState === 'playing' && (
            <VotingDock
              gameConfig={gameConfig}
              currentDeck={currentDeck}
              myVoteDev={myPlayer?.voteDev ?? null}
              myVoteQa={myPlayer?.voteQa ?? null}
              onVote={handleVote}
              onTaskTypeChange={handleTaskTypeChange}
              isOrganizer={isOrganizer}
              anyVoteCast={anyVoteCast}
            />
          )}
        </>
      )}
    </div>
  );
};

export default GameRoom;
