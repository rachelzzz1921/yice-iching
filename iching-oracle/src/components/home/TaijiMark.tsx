/** 传统阴阳太极图（SVG，由 CSS 着色与动画） */
export function TaijiMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="50" cy="50" r="50" className="home-taiji-yin" />
      <path
        d="M50,0 A50,50 0 0,1 50,100 A25,25 0 0,0 50,50 A25,25 0 0,1 50,0 Z"
        className="home-taiji-yang"
      />
      <circle cx="50" cy="25" r="7" className="home-taiji-dot-yin" />
      <circle cx="50" cy="75" r="7" className="home-taiji-dot-yang" />
    </svg>
  );
}
