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

/** Consistent DiceBear avatar URL */
const makeAvatar = (name: string) =>
  `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

// ── Loading Skeleton ─────────────────────────────────────────────────────────
const LoadingSkeleton = () => (
  <div className="flex flex-col h-screen bg-zinc-900 items-center justify-center gap-6">
    <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.4)] animate-pulse">
      <i className="fa-solid fa-spade text-white text-3xl" />
    </div>
    <p className="text-zinc-400 text-sm font-medium animate-pulse">Loading game room…</p>
  </div>
);

// ── Error Screen ─────────────────────────────────────────────────────────────
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

  // ── Game config — loaded from Supabase ──────────────────────────────────
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [configError, setConfigError] = useState('');

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
            id: data.id as string,
            name: (data.name as string) || 'Untitled Game',
            deck: (data.deck as DeckKey) || 'STORY',
            taskType: (data.task_type as TaskTypeKey) || 'BOTH',
          });
        }
        setConfigLoading(false);
      });
  }, [roomId]);

  // ── Session restore from localStorage ───────────────────────────────────
  const restoredSession = useMemo(() => loadSession(roomId), [roomId]);

  const makePlayer = useCallback(
    (session: { playerId: string; playerName: string; playerAvatar: string; isOrganizer: boolean }): Player => ({
      id: session.playerId,
      name: session.playerName,
      avatar: session.playerAvatar,
      hasVoted: false,
      voteDev: null,
      voteQa: null,
      isOrganizer: session.isOrganizer,
    }),
    []
  );

  const [myPlayer, setMyPlayer] = useState<Player | null>(
    restoredSession ? makePlayer(restoredSession) : null
  );
  const [myVoteDev, setMyVoteDev] = useState<string | null>(null);
  const [myVoteQa,  setMyVoteQa]  = useState<string | null>(null);

  // ── Game state ───────────────────────────────────────────────────────────
  const [localGameState, setLocalGameState] = useState<PlayingState>('playing');
  const [countdown, setCountdown] = useState(5);

  // ── Realtime hook ────────────────────────────────────────────────────────
  const stablePlayerId = myPlayer?.id ?? null;
  const { players, roomGameState, resetVotesTick, trackPlayer, broadcastGameState, broadcastResetVotes } =
    useGameRoom(roomId, stablePlayerId);

  const myPlayerRef = useRef<Player | null>(myPlayer);
  myPlayerRef.current = myPlayer;

  // ── Track presence on player change ─────────────────────────────────────
  useEffect(() => {
    if (myPlayer) trackPlayer(myPlayer);
  }, [myPlayer, trackPlayer]);

  // ── React to game-state broadcasts ──────────────────────────────────────
  useEffect(() => {
    if (roomGameState === 'countdown' && localGameState !== 'countdown' && localGameState !== 'results') {
      setLocalGameState('countdown');
      setCountdown(5);
    } else if (roomGameState === 'results' && localGameState !== 'results') {
      setLocalGameState('results');
    } else if (roomGameState === 'playing' && localGameState !== 'playing') {
      setLocalGameState('playing');
      clearMyVotes();
    }
  }, [roomGameState, localGameState]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── React to reset_votes broadcast ──────────────────────────────────────
  // resetVotesTick increments whenever any client broadcasts reset_votes.
  // We stay in 'playing' state — only votes are cleared.
  const prevResetTickRef = useRef(0);
  useEffect(() => {
    if (resetVotesTick > prevResetTickRef.current) {
      prevResetTickRef.current = resetVotesTick;
      clearMyVotes();
    }
  }, [resetVotesTick]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Clear local vote state and update presence. */
  const clearMyVotes = useCallback(() => {
    setMyVoteDev(null);
    setMyVoteQa(null);
    setMyPlayer((prev) => {
      if (!prev) return prev;
      const cleared: Player = { ...prev, hasVoted: false, voteDev: null, voteQa: null };
      saveSession(roomId, {
        playerId: cleared.id,
        playerName: cleared.name,
        playerAvatar: cleared.avatar,
        isOrganizer: cleared.isOrganizer,
      });
      trackPlayer(cleared);
      return cleared;
    });
  }, [roomId, trackPlayer]);

  // ── Countdown timer ──────────────────────────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (localGameState === 'countdown' && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (localGameState === 'countdown' && countdown === 0) {
      setLocalGameState('results');
      if (myPlayerRef.current?.isOrganizer) broadcastGameState('results');
    }
    return () => clearTimeout(timer);
  }, [localGameState, countdown, broadcastGameState]);

  // ── Stats computation ────────────────────────────────────────────────────
  const stats = useMemo<Stats | null>(() => {
    if (localGameState !== 'results' || !gameConfig) return null;

    const isNonNumeric = NON_NUMERIC_DECKS.includes(gameConfig.deck);

    const calculateFor = (type: 'dev' | 'qa'): Stats['dev'] => {
      const rawVotes = players
        .map((p) => (type === 'dev' ? p.voteDev : p.voteQa))
        .filter((v): v is string => v !== null); // includes '?' strings

      if (isNonNumeric) {
        return { mean: null, stdDev: null, rawVotes, numericVotes: null };
      }

      // Numeric decks: exclude '?' from math
      const numericVotes = rawVotes
        .map(voteToNumber)
        .filter((v): v is number => v !== null);

      if (numericVotes.length === 0) {
        return { mean: null, stdDev: null, rawVotes, numericVotes: [] };
      }

      const mean = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;
      const variance = numericVotes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numericVotes.length;
      return {
        mean: parseFloat(mean.toFixed(1)),
        stdDev: Math.sqrt(variance),
        rawVotes,
        numericVotes,
      };
    };

    return { dev: calculateFor('dev'), qa: calculateFor('qa') };
  }, [localGameState, players, gameConfig]);

  /** '?' votes and non-numeric decks never show deviation highlight. */
  const isHighDeviation = (vote: string | null, type: 'dev' | 'qa'): boolean => {
    if (!vote || vote === '?' || !stats || !gameConfig) return false;
    if (NON_NUMERIC_DECKS.includes(gameConfig.deck)) return false;
    const s = stats[type];
    if (s.mean === null || s.stdDev === null || s.stdDev === 0) return false;
    const n = voteToNumber(vote);
    if (n === null) return false;
    return Math.abs(n - s.mean) > s.stdDev;
  };

  // ── Event handlers ───────────────────────────────────────────────────────

  const handleJoin = (name: string) => {
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name: name.trim(),
      avatar: makeAvatar(name.trim()),
      hasVoted: false,
      voteDev: null,
      voteQa: null,
      isOrganizer: false,
    };
    saveSession(roomId, {
      playerId: newPlayer.id,
      playerName: newPlayer.name,
      playerAvatar: newPlayer.avatar,
      isOrganizer: false,
    });
    setMyPlayer(newPlayer);
  };

  const handleVote = (type: 'dev' | 'qa', value: string) => {
    if (!myPlayer || !gameConfig) return;

    // Toggle off if same card clicked again
    const newVoteDev = type === 'dev' ? (myVoteDev === value ? null : value) : myVoteDev;
    const newVoteQa  = type === 'qa'  ? (myVoteQa  === value ? null : value) : myVoteQa;

    setMyVoteDev(newVoteDev);
    setMyVoteQa(newVoteQa);

    let hasVoted = false;
    if (gameConfig.taskType === 'DEV'  && newVoteDev !== null) hasVoted = true;
    if (gameConfig.taskType === 'QA'   && newVoteQa  !== null) hasVoted = true;
    if (gameConfig.taskType === 'BOTH' && (newVoteDev !== null || newVoteQa !== null)) hasVoted = true;

    const updated: Player = { ...myPlayer, voteDev: newVoteDev, voteQa: newVoteQa, hasVoted };
    setMyPlayer(updated);
    trackPlayer(updated);
    saveSession(roomId, {
      playerId: updated.id,
      playerName: updated.name,
      playerAvatar: updated.avatar,
      isOrganizer: updated.isOrganizer,
    });
  };

  const startReveal  = () => broadcastGameState('countdown');
  const restartGame  = () => broadcastGameState('playing');
  const handleReset  = () => broadcastResetVotes();

  // ── Render ───────────────────────────────────────────────────────────────

  if (configLoading) return <LoadingSkeleton />;
  if (configError || !gameConfig) return <ErrorScreen message={configError} />;

  const currentDeck = DECKS[gameConfig.deck];
  const isOrganizer = myPlayer?.isOrganizer ?? false;
  const needsToJoin = myPlayer === null;

  return (
    <div className="flex flex-col h-screen bg-zinc-900">
      <GameHeader
        gameConfig={gameConfig}
        gameState={localGameState}
        roomId={roomId}
        onResetVotes={handleReset}
        onNextRound={restartGame}
        isOrganizer={isOrganizer}
      />

      {needsToJoin ? (
        <JoinScreen onJoin={handleJoin} />
      ) : (
        <>
          <main
            className="flex-1 overflow-y-auto relative flex flex-col items-center justify-center"
            style={{ paddingBottom: gameConfig.taskType === 'BOTH' ? '22rem' : '14rem' }}
          >
            {localGameState === 'countdown' && <CountdownOverlay countdown={countdown} />}

            {localGameState === 'results' && stats && (
              <ResultsSummary gameConfig={gameConfig} stats={stats} />
            )}

            <GameBoard
              players={players}
              gameState={localGameState}
              gameConfig={gameConfig}
              onReveal={startReveal}
              isHighDeviation={isHighDeviation}
              isOrganizer={isOrganizer}
            />
          </main>

          {localGameState === 'playing' && (
            <VotingDock
              gameConfig={gameConfig}
              currentDeck={currentDeck}
              myVoteDev={myVoteDev}
              myVoteQa={myVoteQa}
              onVote={handleVote}
            />
          )}
        </>
      )}
    </div>
  );
};

export default GameRoom;
