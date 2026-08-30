import { MONTH_ABBR } from './fitnessUtils';
import { theme, headingFont } from '../../theme';

const DUSTY_BLUE = '#4C7A94';

// Minutes-per-month bar chart for the current calendar year — a
// straight port of the friends-demo's renderAnnualChart() SVG math
// (viewBox 700x260, 12 fixed month slots, linear scale, current-month
// highlight). Always shows the real current year; unrelated to the
// week-offset slider.
export default function AnnualChart({ log }) {
  const year = new Date().getFullYear();
  const monthTotals = new Array(12).fill(0);
  log.forEach((w) => {
    const [y, m] = w.date.split('-').map(Number);
    if (y === year) monthTotals[m - 1] += Number(w.duration || 0);
  });

  const maxMinutes = Math.max(1, ...monthTotals);
  const chartWidth = 700;
  const chartHeight = 260;
  const paddingTop = 24;
  const paddingBottom = 34;
  const paddingSides = 16;
  const plotHeight = chartHeight - paddingTop - paddingBottom;
  const slotWidth = (chartWidth - paddingSides * 2) / 12;
  const barWidth = slotWidth * 0.55;
  const currentMonthIndex = new Date().getMonth();
  const baselineY = paddingTop + plotHeight;

  return (
    <div style={{ background: theme.surface, borderRadius: 12, boxShadow: '0 2px 8px rgba(38, 49, 43, 0.08)', padding: 24 }}>
      <h3 style={{ fontFamily: headingFont, fontSize: 16, margin: '0 0 16px', color: theme.ink }}>
        Minutes per Month — {year}
      </h3>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: 'auto', display: 'block' }}>
        <line x1={paddingSides} y1={baselineY} x2={chartWidth - paddingSides} y2={baselineY} stroke={theme.line} strokeWidth="1" />
        {monthTotals.map((minutes, i) => {
          const barHeight = Math.max((minutes / maxMinutes) * plotHeight, 0);
          const x = paddingSides + i * slotWidth + (slotWidth - barWidth) / 2;
          const y = paddingTop + (plotHeight - barHeight);
          const barColor = i === currentMonthIndex ? theme.pine : DUSTY_BLUE;
          return (
            <g key={MONTH_ABBR[i]}>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx="3" fill={barColor} />
              {minutes > 0 && (
                <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize="10" fill={theme.inkSoft}>
                  {minutes}
                </text>
              )}
              <text x={x + barWidth / 2} y={chartHeight - paddingBottom + 16} textAnchor="middle" fontSize="11" fill={theme.inkSoft}>
                {MONTH_ABBR[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
