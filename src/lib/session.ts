/**
 * localStorage session helper.
 *
 * We store one session object per room so that:
 *   - The player's identity (name / id / avatar) survives a page refresh.
 *   - The organizer flag is preserved correctly across refreshes.
 *   - Votes are NOT persisted here — they live in Supabase Presence only.
 *     (Vote data in the session would become stale if the round is reset
 *      while the user is refreshed away.)
 */

export interface PlayerSession {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  isOrganizer: boolean;
  roomId: string;
}

const key = (roomId: string) => `pp_session_${roomId}`;

/** Persist the player's identity for a given room. */
export function saveSession(roomId: string, session: Omit<PlayerSession, 'roomId'>): void {
  try {
    localStorage.setItem(key(roomId), JSON.stringify({ ...session, roomId }));
  } catch {
    // localStorage may be blocked in private/incognito mode — fail silently
  }
}

/** Load a previously saved session for a room. Returns null if not found. */
export function loadSession(roomId: string): PlayerSession | null {
  try {
    const raw = localStorage.getItem(key(roomId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlayerSession;
    // Sanity check: must belong to the correct room
    if (parsed.roomId !== roomId) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Remove the session when the player explicitly leaves (currently unused, reserved). */
export function clearSession(roomId: string): void {
  try {
    localStorage.removeItem(key(roomId));
  } catch {
    // ignore
  }
}

/**
 * Read a previously used player name from any saved session.
 * Used to prefill the "Your Name" field on the setup screen.
 */
export function getPlayerName(): string {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k?.startsWith('pp_session_')) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as PlayerSession;
      if (parsed.playerName) return parsed.playerName;
    }
  } catch {
    // ignore
  }
  return '';
}
