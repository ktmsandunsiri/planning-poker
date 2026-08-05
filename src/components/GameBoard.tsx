import { useEffect, useRef, useState } from 'react';
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

// ─── Seat scale ───────────────────────────────────────────────────────────────
// Note: we NO LONGER use scale to fight overlap. Overlap is solved by growing
// the ellipse (see seatingRx/seatingRy below). Scale is kept only as a subtle
// cosmetic reduction for very large groups.
function getSeatScale(total: number): number {
  if (total <= 10) return 1.0;
  if (total <= 16) return 0.90;
  return 0.80;
}

// ─── Ramanujan ellipse circumference approximation ───────────────────────────
// Accurate to within 0.04% for typical rx:ry ratios used here.
function ellipseCircumference(a: number, b: number): number {
  const h = Math.pow(a - b, 2) / Math.pow(a + b, 2);
  return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

// ─── Arc-length-equalized ellipse distribution ────────────────────────────────
// Places N points evenly along the perimeter of an ellipse with semi-axes a, b.
// Uses a 1000-step cumulative arc-length lookup table + linear interpolation.
// The parametric form used here: x = a·sin(t), y = −b·cos(t)
// → derivatives: dx/dt = a·cos(t),  dy/dt = b·sin(t)
// → at t=0: point is (0, −b) = 12 o'clock top centre. ✓
function equalArcAngles(n: number, a: number, b: number): number[] {
  const STEPS = 1000;
  const dt = (Math.PI * 2) / STEPS;
  const cumLen: number[] = new Array(STEPS + 1);
  cumLen[0] = 0;

  for (let i = 0; i < STEPS; i++) {
    const t = i * dt;
    const dx = a * Math.cos(t);
    const dy = b * Math.sin(t);
    cumLen[i + 1] = cumLen[i] + Math.sqrt(dx * dx + dy * dy) * dt;
  }
  const totalLen = cumLen[STEPS];
  const angles: number[] = [];

  for (let i = 0; i < n; i++) {
    const targetLen = (i / n) * totalLen;
    let lo = 0, hi = STEPS;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cumLen[mid] < targetLen) lo = mid; else hi = mid;
    }
    const frac = (targetLen - cumLen[lo]) / (cumLen[hi] - cumLen[lo] + 1e-12);
    angles.push((lo + frac) * dt);
  }
  return angles;
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

  // ─── Observe the poker-table div so base rx/ry stay in sync ──────────────
  const tableRef = useRef<HTMLDivElement>(null);
  const [tableSize, setTableSize] = useState({ w: 700, h: 420 });

  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    const measure = () => setTableSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ─── Outer container ref (for minHeight calculation) ─────────────────────
  const outerRef = useRef<HTMLDivElement>(null);

  // ─── Seat scale ───────────────────────────────────────────────────────────
  const seatScale = getSeatScale(players.length);

  // ─── Seating ellipse: grow to guarantee no overlap ───────────────────────
  // The base ellipse hugs the table edge.
  const SEAT_MARGIN = 12; // px gap between table rim and seat anchor point
  const baseRx = tableSize.w / 2 + SEAT_MARGIN;
  const baseRy = tableSize.h / 2 + SEAT_MARGIN;

  // Each seat occupies ~150px of perimeter at scale 1 (card + avatar + label,
  // measured along the tangent direction at the tightest point of the ellipse).
  // We use the full seat height as a conservative footprint estimate, since the
  // worst-case bunching happens where the tangent is vertical (left/right poles).
  const SEAT_FOOTPRINT = 150; // px at scale 1
  const scaledFootprint = SEAT_FOOTPRINT * seatScale;
  const requiredCircumference = players.length * scaledFootprint;
  const baseCircumference = ellipseCircumference(baseRx, baseRy);

  // Only grow — never shrink below the table boundary.
  const growth = Math.max(1, requiredCircumference / baseCircumference);
  const seatingRx = baseRx * growth;
  const seatingRy = baseRy * growth;

  // ─── Arc-length-equalized angles ─────────────────────────────────────────
  const seatAngles = equalArcAngles(players.length, seatingRx, seatingRy);


  return (
    <div
      ref={outerRef}
      className="relative w-full flex items-center justify-center"
      style={{ minHeight: `${seatingRy * 2 + 180}px` }}
    >
      {/* ── Poker Table ── centred absolutely ── */}
      <div
        ref={tableRef}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[700px] h-[420px] poker-table rounded-full z-0 flex flex-col items-center justify-center gap-3"
      >
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

      {/* ── Player seats ── */}
      {players.map((player, index) => {
        const t = seatAngles[index];
        // x = seatingRx · sin(t) → horizontal axis
        // y = −seatingRy · cos(t) → vertical axis, 12 o'clock at t=0
        const left = `calc(50% + ${Math.sin(t) * seatingRx}px)`;
        const top = `calc(50% + ${-Math.cos(t) * seatingRy}px)`;

        return (
          <div
            key={player.id}
            className="absolute z-20 flex flex-col items-center"
            style={{
              left,
              top,
              transform: `translate(-50%, -50%) scale(${seatScale})`,
              transformOrigin: 'center center',
            }}
          >
            {/* Vote cards or card backs */}
            {gameState === 'results' ? (
              <div className="flex -space-x-2 mb-2 animate-pop-in">
                {['DEV', 'BOTH'].includes(gameConfig.taskType) && (() => {
                  const v = player.voteDev;
                  const isQ = v === '?';
                  const highDev = isHighDeviation(v, 'dev');
                  return (
                    <div
                      className={`w-10 h-14 rounded-lg flex items-center justify-center font-bold shadow-md relative text-sm z-10
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
                      className={`w-10 h-14 rounded-lg flex items-center justify-center font-bold shadow-md relative text-sm z-0
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
              className="w-12 h-12 rounded-full border-2 border-zinc-600 shadow-[0_0_10px_rgba(0,0,0,0.5)] relative z-20"
            />
            {/* Name tag */}
            <span className="text-xs font-bold text-zinc-100 mt-1 bg-zinc-800/90 px-2 py-0.5 rounded-full border border-zinc-700/50 whitespace-nowrap max-w-[80px] truncate relative z-20">
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
