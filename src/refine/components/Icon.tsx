/**
 * Icon — wrapper SVG igual ao ICO() helper do mockup.
 * Recebe um path (ou multiple paths separados por espaço extra) e renderiza com
 * mesmo viewBox 24x24 + stroke-width default.
 */
import { forwardRef } from "react";

type IconProps = {
  d: string;
  strokeWidth?: number;
  size?: number;
};

export const Icon = forwardRef<SVGSVGElement, IconProps>(function Icon(
  { d, strokeWidth = 1.6, size },
  ref,
) {
  // O mockup usa multiple paths concatenados na mesma string. Splitamos
  // por "M" (start of new path) e renderizamos cada um separadamente.
  const paths = d.split(/(?=M[\d.\-\s]|m[\d.\-\s])/).filter(Boolean);
  return (
    <svg
      ref={ref}
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
});
