/**
 * Icon — wrapper SVG igual ao ICO() helper do mockup.
 * Recebe um path (ou multiple paths separados por espaço extra) e renderiza com
 * mesmo viewBox 24x24 + stroke-width default.
 */
export function Icon({ d, strokeWidth = 1.6, size }: { d: string; strokeWidth?: number; size?: number }) {
  // O mockup usa multiple paths concatenados na mesma string. Vamos splitar
  // por "M" (start of new path) e renderizar cada um separadamente.
  const paths = d.split(/(?=M[\d.\-\s]|m[\d.\-\s])/).filter(Boolean);
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
    >
      {paths.map((p, i) => (
        <path key={i} d={p.trim()} />
      ))}
    </svg>
  );
}
