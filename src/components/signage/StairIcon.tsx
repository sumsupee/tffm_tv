export const StairIcon = ({ size = "1em", className = "", style, color }: { size?: number | string; className?: string; style?: React.CSSProperties; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
    <path d="M2.5 20h4v-4h4v-4h4V8h4V4V20H2.5Z" />
  </svg>
);
