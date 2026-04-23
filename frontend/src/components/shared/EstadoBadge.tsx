// src/components/shared/EstadoBadge.tsx
import type { EstadoExpediente } from '../../types';
import { ESTADO_CONFIG }    from '../../utils/constants';

interface EstadoBadgeProps {
  estado: EstadoExpediente;
  size?:  'sm' | 'md';
}

export default function EstadoBadge({ estado, size = 'md' }: EstadoBadgeProps) {
  const config = ESTADO_CONFIG[estado] ?? {
    label: estado,
    color: 'text-gray-700',
    bg:    'bg-gray-100',
  };

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full
        ${config.bg} ${config.color}
        ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-xs'}
      `}
    >
      {config.label}
    </span>
  );
}