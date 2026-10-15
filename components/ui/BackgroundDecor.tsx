export function BackgroundDecor() {
  return (
    <div className="app-bg" aria-hidden="true">
      <span className="app-orb app-orb-cyan" />
      <span className="app-orb app-orb-violet" />
      <span className="app-orb app-orb-pink" />
      <span
        className="glass-shape hidden sm:block"
        style={{ width: 180, height: 180, top: "18%", left: "44%", transform: "rotate(18deg)" }}
      />
      <span
        className="glass-shape hidden lg:block"
        style={{ width: 240, height: 150, bottom: "14%", left: "-40px", transform: "rotate(-12deg)" }}
      />
      <span
        className="glass-shape hidden lg:block"
        style={{ width: 130, height: 130, top: "58%", right: "6%", transform: "rotate(24deg)" }}
      />
    </div>
  );
}
