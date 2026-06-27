export const LevelCompletedOverlay = () => (
  <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
    <style>{`
      @keyframes stone-top {
        0%, 5%  { transform: translateY(0); }
        70%, 100% { transform: translateY(-100%); }
      }
      @keyframes stone-bottom {
        0%, 5%  { transform: translateY(0); }
        70%, 100% { transform: translateY(100%); }
      }
      @keyframes iris-in {
        0%, 20% { clip-path: circle(0% at 50% 50%); }
        100%    { clip-path: circle(150% at 50% 50%); }
      }
    `}</style>

    {/* Black iris — expands from center to fill screen */}
    <div
      className="absolute inset-0 bg-black"
      style={{ animation: "iris-in 2s cubic-bezier(0.4,0,0.2,1) forwards" }}
    />

    {/* Stone panels slide apart, revealing the iris behind */}
    <div
      className="absolute inset-x-0 top-0 z-10 h-1/2 bg-stone-700"
      style={{ animation: "stone-top 1.4s cubic-bezier(0.4,0,0.6,1) forwards" }}
    />
    <div
      className="absolute inset-x-0 bottom-0 z-10 h-1/2 bg-stone-700"
      style={{ animation: "stone-bottom 1.4s cubic-bezier(0.4,0,0.6,1) forwards" }}
    />
  </div>
)
