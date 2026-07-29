import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Player, PlayingState } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseGameRoomReturn {
  players: Player[];
  roomGameState: PlayingState;
  /** Increments whenever a 'reset_votes' broadcast is received. Watch this in the page to clear local votes. */
  resetVotesTick: number;
  /** Track (or re-track) this player's presence with their latest data. */
  trackPlayer: (player: Player) => Promise<void>;
  /** Broadcast a game-state transition to every client in the room. */
  broadcastGameState: (state: PlayingState) => void;
  /** Broadcast a vote-reset event (clears votes without changing game state). */
  broadcastResetVotes: () => void;
}

/**
 * Manages Supabase Realtime for a single game room.
 *
 * Architecture:
 *  - Presence  → player list (join / leave / vote updates)
 *  - Broadcast → game-state transitions (reveal / restart / reset votes)
 *
 * `playerId` is used as the Supabase Presence channel key.
 * Using the same stable UUID across all browser tabs of the same user means
 * Supabase treats them as ONE presence slot (last-write-wins), completely
 * eliminating duplicate avatars at the poker table.
 *
 * Falls back to local-only mode when Supabase credentials are absent.
 */
export function useGameRoom(roomId: string, playerId: string | null): UseGameRoomReturn {
  const [players, setPlayers] = useState<Player[]>([]);
  const [roomGameState, setRoomGameState] = useState<PlayingState>('playing');
  const [resetVotesTick, setResetVotesTick] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const pendingTrackRef = useRef<Player | null>(null);

  // ── Rebuild players[] from the full presence snapshot ─────────────────────
  const rebuildPlayers = useCallback((channel: RealtimeChannel) => {
    const state = channel.presenceState<{ player: Player }>();
    const byId = new Map<string, Player>();
    Object.values(state).forEach((presences) => {
      presences.forEach((p) => {
        if (!p.player?.id) return;
        const existing = byId.get(p.player.id);
        if (!existing || p.player.hasVoted || !existing.hasVoted) {
          byId.set(p.player.id, p.player);
        }
      });
    });
    setPlayers(Array.from(byId.values()));
  }, []);

  // ── Channel setup — deferred until playerId is available ──────────────────
  useEffect(() => {
    if (!roomId || !playerId) return;
    if (!supabase) return;

    const channel = supabase.channel(`game-room:${roomId}`, {
      config: {
        broadcast: { self: true },
        // Stable presence key = player UUID → all tabs of same user share one slot
        presence: { key: playerId },
      },
    });

    channelRef.current = channel;

    // Presence listeners
    channel
      .on('presence', { event: 'sync' },  () => rebuildPlayers(channel))
      .on('presence', { event: 'join' },  () => rebuildPlayers(channel))
      .on('presence', { event: 'leave' }, () => rebuildPlayers(channel));

    // Broadcast: game-state transitions
    channel.on('broadcast', { event: 'game_state_update' }, ({ payload }) => {
      const newState = payload?.state as PlayingState | undefined;
      if (newState) setRoomGameState(newState);
    });

    // Broadcast: vote reset (clear votes, stay in 'playing')
    channel.on('broadcast', { event: 'reset_votes' }, () => {
      setResetVotesTick((n) => n + 1);
    });

    // Subscribe — track immediately on SUBSCRIBED
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        subscribedRef.current = true;
        if (pendingTrackRef.current) {
          channel.track({ player: pendingTrackRef.current }).catch(console.error);
        }
      }
    });

    return () => {
      subscribedRef.current = false;
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [roomId, playerId, rebuildPlayers]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const trackPlayer = useCallback(async (player: Player): Promise<void> => {
    if (!supabase) {
      setPlayers((prev) => {
        const exists = prev.some((p) => p.id === player.id);
        return exists
          ? prev.map((p) => (p.id === player.id ? player : p))
          : [...prev, player];
      });
      return;
    }
    pendingTrackRef.current = player;
    if (channelRef.current && subscribedRef.current) {
      await channelRef.current.track({ player }).catch(console.error);
    }
  }, []);

  const broadcastGameState = useCallback((state: PlayingState) => {
    if (supabase && channelRef.current) {
      channelRef.current
        .send({ type: 'broadcast', event: 'game_state_update', payload: { state } })
        .catch(console.error);
    } else {
      setRoomGameState(state);
    }
  }, []);

  const broadcastResetVotes = useCallback(() => {
    if (supabase && channelRef.current) {
      channelRef.current
        .send({ type: 'broadcast', event: 'reset_votes', payload: {} })
        .catch(console.error);
    } else {
      // Local-only: fire the tick directly
      setResetVotesTick((n) => n + 1);
    }
  }, []);

  return { players, roomGameState, resetVotesTick, trackPlayer, broadcastGameState, broadcastResetVotes };
}
