import { useState } from 'react';

interface JoinScreenProps {
  onJoin: (name: string) => void;
}

const JoinScreen = ({ onJoin }: JoinScreenProps) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) onJoin(name.trim());
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-zinc-900 p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-sm bg-zinc-800/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 animate-pop-in border border-zinc-700 relative z-10">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.4)]">
            <i className="fa-solid fa-spade text-white text-2xl" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-1">Join the Game</h2>
        <p className="text-zinc-400 text-center text-sm mb-8">Enter your name to take a seat at the table.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">Your Name</label>
            <input
              type="text"
              autoFocus
              maxLength={30}
              className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-zinc-500"
              placeholder="e.g. Alex Chen"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full font-gaming bg-black text-white py-4 px-6 rounded-2xl text-base uppercase tracking-wider border border-zinc-700 shadow-[0_0_20px_rgba(0,0,0,0.8)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:border-indigo-400 transition-all duration-300 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
          >
            <i className="fa-solid fa-chair text-indigo-400" />
            Take a seat
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinScreen;
