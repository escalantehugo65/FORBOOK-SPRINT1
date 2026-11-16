import { formatPoints, levelNames } from '../utils/shop';

// Nivel de confianza (sale de la reputación, no del saldo): Nuevo, Aportante o Confiable.
export default function LevelBadge({ level, reputation }) {
  if (!level) return null;
  return <span className={`badge level-badge level-${level}`}>
    <span className="level-dot" aria-hidden="true"/>{levelNames[level]}
    {reputation !== undefined && <span className="level-reputation">· {formatPoints(reputation)} de reputación</span>}
  </span>;
}
