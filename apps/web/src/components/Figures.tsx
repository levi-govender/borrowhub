import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

type TileProps = {
  label: string;
  value: number;
  foot: string;
  icon: IconName;
  accent: string;
  alert?: boolean;
  ariaLabel?: string;
  onClick: () => void;
};

/**
 * Stat tile: label · value · foot. Proportional figures on purpose — tabular
 * digits look loose at display sizes and nothing aligns vertically here.
 */
export function StatTile({ label, value, foot, icon, accent, alert = false, ariaLabel, onClick }: TileProps) {
  return (
    <button
      type="button"
      className={`tile${alert ? " tile--alert" : ""}`}
      style={{ ["--tile-accent" as string]: accent }}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <span className="tile__top">
        <span className="tile__glyph">
          <Icon name={icon} size={15} />
        </span>
        <span className="tile__label">{label}</span>
      </span>
      <span className="tile__value">{value.toLocaleString("en-ZA")}</span>
      <span className="tile__foot">
        {foot}
        <span className="tile__cta" aria-hidden="true">
          <Icon name="arrowRight" size={13} />
        </span>
      </span>
    </button>
  );
}

export type Series = {
  key: string;
  label: string;
  value: number;
  color: string;
};

/**
 * Single stacked bar for the loan pipeline. Segments are separated by a 2px
 * surface gap; identity comes from the legend beside it, never colour alone.
 */
export function PipelineBar({ series, emptyNote }: { series: Series[]; emptyNote: string }) {
  const total = series.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="figure">
      {total === 0 ? (
        <div className="bar" aria-hidden="true" />
      ) : (
        <div className="bar" aria-hidden="true">
          {series
            .filter((item) => item.value > 0)
            .map((item) => (
              <div
                key={item.key}
                className="bar__seg"
                data-label={`${item.label}: ${item.value}`}
                style={{ ["--seg-color" as string]: item.color, flexGrow: item.value }}
              />
            ))}
        </div>
      )}
      <div className="legend">
        {series.map((item) => (
          <span className="legend__item" key={item.key}>
            <span className="legend__swatch" style={{ ["--seg-color" as string]: item.color }} />
            {item.label}
            <span className="legend__value tnum">{item.value.toLocaleString("en-ZA")}</span>
          </span>
        ))}
      </div>
      {total === 0 ? <p className="figure__note">{emptyNote}</p> : null}
    </div>
  );
}

export function Meter({
  label,
  detail,
  ratio,
  color,
  note,
}: {
  label: string;
  detail: string;
  ratio: number;
  color: string;
  note?: ReactNode;
}) {
  const percent = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  const rounded = Math.round(percent * 100);

  return (
    <div className="meter">
      <p className="meter__head">
        <span>{label}</span>
        <span className="meter__value">{rounded}%</span>
      </p>
      <div
        className="meter__track"
        style={{ ["--meter-color" as string]: color }}
        role="meter"
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} — ${detail}`}
      >
        <div className="meter__fill" style={{ width: `${rounded}%` }} />
      </div>
      <p className="figure__note">{note ?? detail}</p>
    </div>
  );
}

export function Pager({
  page,
  pageCount,
  onChange,
  label,
}: {
  page: number;
  pageCount: number;
  onChange: (next: number) => void;
  label: string;
}) {
  return (
    <div className="pager">
      <button type="button" className="btn btn--sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <p>
        Page {page} of {pageCount} · {label}
      </p>
      <button type="button" className="btn btn--sm" disabled={page >= pageCount} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </div>
  );
}
