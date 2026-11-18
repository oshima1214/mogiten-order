/**
 * "Now cooking" illustration on the waiting screen: a gyoza character bouncing in a pan.
 * Drawn shapes for now; to use real artwork, put transparent PNG/SVG files in
 * public/cooking/ and replace the <g> groups below with <image href="/cooking/…">,
 * keeping the cooking-* classes so the motion stays the same.
 * Animations live in globals.css and stop for "reduce motion" users.
 */
function Steam({ x, delay }: { x: number; delay: number }) {
  return (
    <path
      className="cooking-steam"
      style={{ animationDelay: `${delay}s` }}
      d={`M${x} 70 c -8 -12, 8 -22, 0 -34 c -8 -12, 8 -22, 0 -34`}
      fill="none"
      stroke="#C9C9CF"
      strokeWidth="5"
      strokeLinecap="round"
    />
  );
}

export function CookingAnimation() {
  return (
    <svg className="cooking-anim" role="img" aria-label="餃子を焼いています" width="300" height="170" viewBox="0 0 300 170">
      {/* pan */}
      <ellipse cx="140" cy="128" rx="118" ry="34" fill="#2C2C30" />
      <ellipse cx="140" cy="122" rx="104" ry="26" fill="#45454B" />
      <rect x="250" y="116" width="48" height="12" rx="6" fill="#2C2C30" />

      {/* gyoza character */}
      <g className="cooking-chara">
        <g transform="translate(84 46)">
          <g transform="scale(1.9)">
            <path d="M2 30 C 8 4, 52 4, 58 30 Z" fill="#F7E6BF" stroke="#C99A55" strokeWidth="2" strokeLinejoin="round" />
            <path d="M6 30 L54 30" stroke="#B9702C" strokeWidth="4" strokeLinecap="round" />
            <path
              d="M18 12 q3 4 0 8 M26 9 q3 4 0 8 M34 9 q3 4 0 8 M42 12 q3 4 0 8"
              fill="none"
              stroke="#D9B97E"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </g>
          <path d="M38 36 q5 -5 10 0 M66 36 q5 -5 10 0" fill="none" stroke="#5A3A1A" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="34" cy="45" rx="6" ry="3.5" fill="#F4A7A0" opacity=".8" />
          <ellipse cx="80" cy="45" rx="6" ry="3.5" fill="#F4A7A0" opacity=".8" />
          <path d="M52 46 q5 5 10 0" fill="none" stroke="#5A3A1A" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      </g>

      <Steam x={70} delay={0} />
      <Steam x={210} delay={0.9} />
      <text className="cooking-sound" x="226" y="40" fontSize="18" fontWeight="700" fill="#C76E00">
        じゅ〜
      </text>
    </svg>
  );
}
