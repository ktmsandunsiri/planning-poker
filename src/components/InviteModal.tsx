import { useState, useEffect } from 'react';

interface InviteModalProps {
  onClose: () => void;
}

const InviteModal = ({ onClose }: InviteModalProps) => {
  const [copied, setCopied] = useState(false);
  const url = window.location.href;

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      // Fallback: select the text
      const el = document.getElementById('invite-url-display');
      if (el) {
        const range = document.createRange();
        range.selectNode(el);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
    });
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-zinc-800 rounded-3xl p-8 max-w-lg w-full mx-4 border border-zinc-700 shadow-[0_0_60px_rgba(0,0,0,0.8)] animate-pop-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-user-plus text-white text-sm" />
            </div>
            <h3 className="text-xl font-bold text-white">Invite Players</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <p className="text-zinc-400 text-sm mb-5">
          Share this link with your team. Anyone who opens it will be prompted to join the game.
        </p>

        {/* URL display */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 mb-4 flex items-center gap-3 group">
          <i className="fa-solid fa-link text-zinc-500 text-sm flex-shrink-0" />
          <span
            id="invite-url-display"
            className="text-zinc-300 text-sm font-mono truncate flex-1 select-all"
          >
            {url}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className={`flex-1 font-gaming py-3 px-6 rounded-xl text-sm uppercase tracking-wider border transition-all duration-300 flex items-center justify-center gap-2 ${
              copied
                ? 'bg-green-900/50 border-green-500 text-green-300 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                : 'bg-black text-white border-zinc-700 shadow-[0_0_15px_rgba(0,0,0,0.8)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] hover:border-indigo-400 hover:scale-[1.02] active:scale-95'
            }`}
          >
            <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} />
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-xl text-sm text-zinc-400 border border-zinc-700 hover:bg-zinc-700 hover:text-white transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;
