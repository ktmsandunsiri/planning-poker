import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-900 p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl text-center space-y-6 animate-slide-up relative z-10">
        <div className="flex justify-center mb-8">
          <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.5)] transform rotate-12 hover:rotate-0 transition-transform duration-500">
            <i className="fa-solid fa-spade text-white text-5xl transform -rotate-12 hover:rotate-0 transition-transform duration-500" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white drop-shadow-xl">
            Planning Poker
          </h1>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 drop-shadow-md pb-2">
            Where agile estimation feels like a game.
          </h2>
        </div>

        <p className="text-xl md:text-2xl text-zinc-300 max-w-4xl mx-auto leading-relaxed font-medium mt-8 drop-shadow-sm">
          Make sprint planning more engaging with live voting, instant results, support for up to 20 participants, and specialized workflows for Developers and QA.
        </p>

        <div className="pt-12">
          <button
            onClick={() => navigate('/setup')}
            className="font-gaming bg-black text-white py-5 px-10 rounded-2xl text-lg uppercase tracking-wider border border-zinc-700 shadow-[0_0_20px_rgba(0,0,0,0.8)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:border-indigo-400 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-4 mx-auto"
          >
            <i className="fa-solid fa-gamepad text-indigo-400 text-2xl" />
            Start new game
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
