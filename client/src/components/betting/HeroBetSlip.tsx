import { BetSlip } from './BetSlip';

export function HeroBetSlip() {
  return (
    <div className="flex flex-col h-full bg-[#061118] border-l border-[#1e3a3f]">
      {/* Hero Image Section */}
      <div className="relative overflow-hidden rounded-t-xl">
        <img
          src="/assets/image_1764014704063.png"
          alt="SuiBets"
          className="w-full h-auto object-cover shadow-2xl shadow-cyan-500/30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#061118] via-transparent to-transparent pointer-events-none" />
      </div>

      {/* BetSlip Section */}
      <div className="flex-1 overflow-y-auto p-4">
        <BetSlip />
      </div>
    </div>
  );
}
