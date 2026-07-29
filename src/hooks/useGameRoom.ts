import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Player, TaskTypeKey } from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseGameRoomReturn {
  players: Player[];
  revealTick: number;
  nextRoundTick: number;
  resetVotesTick: number;
  remoteTaskType: TaskTypeKey | null;
  trackPlayer: (player: Player) => Promise<void>;
  broadcastReveal: () => void;
  broadcastNextRound: () => void;
  broadcastResetVotes: () => void;
  broadcastTaskType: (taskType: TaskTypeKey) => void;
}

export function useGameRoom(roomId: string, playerId: string | null): UseGameRoomReturn {
  const [players,        setPlayers]        = useState<Player[]>([]);
  const [revealTick,     setRevealTick]     = useState(0);
  const [nextRoundTick,  setNextRoundTick]  = useState(0);
  const [resetVotesTick, setResetVotesTick] = useState(0);
  const [remoteTaskType, setRemoteTaskType] = useState<TaskTypeKey | null>(null);

  const channelRef      = useRef<RealtimeChannel | null>(null);
  const subscribedRef   = useRef(false);
  const pendingTrackRef = useRef<Player | null>(null);

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

  useEffect(() => {
    if (!roomId || !playerId || !supabase) return;

    /**
     * WHY self: false
     * ───────────────
     * We no longer rely on self-receive to drive local state changes.
     * Instead every broadcast function fires its tick setter IMMEDIATELY
     * (before hitting the network), then sends the event so other clients
     * can do the same. This eliminates any dependency on WebSocket round-trip
     * timing and makes the organizer's UI update synchronously on click.
     */
    const channel = supabase.channel(`game-room:${roomId}`, {
      config: {
        broadcast: { self: false },
        presence:  { key: playerId },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' },  () => rebuildPlayers(channel))
      .on('presence', { event: 'join' },  () => rebuildPlayers(channel))
      .on('presence', { event: 'leave' }, () => rebuildPlayers(channel));

    // These listeners handle events arriving FROM OTHER CLIENTS only.
    // The sender's own tick is incremented locally before sending (see below).
    channel.on('broadcast', { event: 'reveal'      }, () => {
      console.log('[useGameRoom] received reveal from peer');
      setRevealTick(n => n + 1);
    });
    channel.on('broadcast', { event: 'next_round'  }, () => {
      console.log('[useGameRoom] received next_round from peer');
      setNextRoundTick(n => n + 1);
    });
    channel.on('broadcast', { event: 'reset_votes' }, () => {
      console.log('[useGameRoom] received reset_votes from peer');
      setResetVotesTick(n => n + 1);
    });
    channel.on('broadcast', { event: 'task_type_update' }, ({ payload }) => {
      const tt = payload?.taskType as TaskTypeKey | undefined;
      if (tt) setRemoteTaskType(tt);
    });

    channel.subscribe((status) => {
      console.log('[useGameRoom] channel status:', status);
      if (status === 'SUBSCRIBED') {
        subscribedRef.current = true;
        if (pendingTrackRef.current) {
          channel.track({ player: pendingTrackRef.current }).catch(console.error);
          pendingTrackRef.current = null;
        }
      }
    });

    return () => {
      subscribedRef.current = false;
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [roomId, playerId, rebuildPlayers]);

  const trackPlayer = useCallback(async (player: Player): Promise<void> => {
    if (!supabase) {
      setPlayers(prev => {
        const exists = prev.some(p => p.id === player.id);
        return exists
          ? prev.map(p => p.id === player.id ? player : p)
          : [...prev, player];
      });
      return;
    }
    pendingTrackRef.current = player;
    if (channelRef.current && subscribedRef.current) {
      await channelRef.current.track({ player }).catch(console.error);
    }
  }, []);

  /**
   * sendToPeers — sends a broadcast event to all OTHER clients.
   * The caller is responsible for updating their OWN state immediately
   * (before calling this), so there is no dependency on self-receive.
   */
  const sendToPeers = useCallback((event: string, payload: Record<string, unknown> = {}) => {
    if (supabase && channelRef.current && subscribedRef.current) {
      channelRef.current
        .send({ type: 'broadcast', event, payload })
        .catch((err) => console.error(`[useGameRoom] peer broadcast '${event}' failed:`, err));
    }
    // If not connected, nothing to do — the tick was already set locally.
  }, []);

  /**
   * PATTERN: fire local tick first (synchronous, immediate), then broadcast
   * to peers. The organizer's UI reacts instantly. Peers react when they
   * receive the message. No WebSocket round-trip on the critical path.
   */
  const broadcastReveal = useCallback(() => {
    console.log('[useGameRoom] broadcastReveal — firing local tick');
    setRevealTick(n => n + 1);
    sendToPeers('reveal');
  }, [sendToPeers]);

  const broadcastNextRound = useCallback(() => {
    console.log('[useGameRoom] broadcastNextRound — firing local tick');
    setNextRoundTick(n => n + 1);
    sendToPeers('next_round');
  }, [sendToPeers]);

  const broadcastResetVotes = useCallback(() => {
    console.log('[useGameRoom] broadcastResetVotes — firing local tick');
    setResetVotesTick(n => n + 1);
    sendToPeers('reset_votes');
  }, [sendToPeers]);

  const broadcastTaskType = useCallback((taskType: TaskTypeKey) => {
    setRemoteTaskType(taskType); // apply locally
    sendToPeers('task_type_update', { taskType });
  }, [sendToPeers]);

  return {
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
  };
}
