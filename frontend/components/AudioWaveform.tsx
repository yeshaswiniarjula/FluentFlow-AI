'use client';

interface AudioWaveformProps {
  isActive: boolean;
  color?: 'blue' | 'green';
}

const COLOR_MAP = {
  blue:  'bg-blue-400',
  green: 'bg-emerald-400',
};

export function AudioWaveform({ isActive, color = 'blue' }: AudioWaveformProps) {
  const barColor = COLOR_MAP[color];

  return (
    <div
      className="flex items-center justify-center gap-1 h-8"
      role="img"
      aria-label={isActive ? 'Audio active' : 'Audio inactive'}
    >
      {[0, 1, 2, 3, 4].map(i => (
        <span
          key={i}
          className={`
            wave-bar transition-colors duration-300
            ${barColor}
            ${isActive ? '' : '[animation-play-state:paused]'}
          `}
          style={{ height: isActive ? undefined : '8px', opacity: isActive ? undefined : 0.25 }}
        />
      ))}
    </div>
  );
}
