interface CountdownOverlayProps {
  countdown: number;
}

const CountdownOverlay = ({ countdown }: CountdownOverlayProps) => {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-zinc-900/85 backdrop-blur-sm">
      <p className="text-zinc-400 font-gaming text-sm uppercase tracking-widest mb-6 animate-pulse">
        Revealing in…
      </p>
      <div className="text-9xl font-black text-white animate-countdown drop-shadow-[0_0_40px_rgba(99,102,241,0.6)]">
        {countdown}
      </div>
    </div>
  );
};

export default CountdownOverlay;
