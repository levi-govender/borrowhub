import { Icon } from "../components/Icon";
import { Meter, PipelineBar, StatTile, type Series } from "../components/Figures";
import { EmptyState, ErrorState, LoadingRows, LoadingTiles } from "../components/States";
import { OverdueBadge } from "../components/Badge";
import { formatLateness } from "../format";
import type { AdminSummary, BookingListItem, Me } from "../api";

type Props = {
  summary: AdminSummary | null;
  me: Me | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpenBookings: (card: "reserved" | "checkedOut" | "overdue") => void;
  onOpenInventory: () => void;
  overdue: { items: BookingListItem[]; loading: boolean; error: string | null };
  onOpenBooking: (id: string) => void;
  bffBaseUrl: string;
};

export function DashboardView({
  summary,
  me,
  loading,
  error,
  onRetry,
  onOpenBookings,
  onOpenInventory,
  overdue,
  onOpenBooking,
  bffBaseUrl,
}: Props) {
  if (loading) {
    return <LoadingTiles label="Loading dashboard…" />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (!summary) {
    return null;
  }

  const onLoan = summary.reserved + summary.checkedOut;
  const series: Series[] = [
    { key: "reserved", label: "Reserved", value: summary.reserved, color: "var(--series-reserved)" },
    { key: "checkedOut", label: "Checked out", value: summary.checkedOut, color: "var(--series-checkedout)" },
    { key: "overdue", label: "Overdue", value: summary.overdue, color: "var(--series-overdue)" },
  ];
  const utilisation = summary.activeEquipment > 0 ? summary.checkedOut / summary.activeEquipment : 0;

  return (
    <>
      <section className="summary grid-kpi rise" aria-label="Booking summary">
        <StatTile
          label="Reserved"
          value={summary.reserved}
          foot="Awaiting collection"
          icon="calendar"
          accent="var(--series-reserved)"
          onClick={() => onOpenBookings("reserved")}
        />
        <StatTile
          label="Checked out"
          value={summary.checkedOut}
          foot="Out with employees"
          icon="clock"
          accent="var(--series-checkedout)"
          onClick={() => onOpenBookings("checkedOut")}
        />
        <StatTile
          label="Overdue"
          value={summary.overdue}
          foot={summary.overdue > 0 ? "Past the return window" : "Every loan inside its window"}
          icon="alert"
          accent="var(--critical)"
          alert={summary.overdue > 0}
          ariaLabel="View overdue loans"
          onClick={() => onOpenBookings("overdue")}
        />
        <StatTile
          label="Active equipment"
          value={summary.activeEquipment}
          foot="Bookable assets"
          icon="box"
          accent="var(--brand)"
          onClick={onOpenInventory}
        />
      </section>

      <div className="grid-split rise">
        <section className="card" aria-labelledby="pipeline-title">
          <header className="card__head">
            <div className="card__title">
              <Icon name="bolt" size={16} />
              <div>
                <h2 id="pipeline-title">Loan pipeline</h2>
                <p className="card__sub">{onLoan} open loans across the office</p>
              </div>
            </div>
          </header>
          <div className="card__body" style={{ display: "flex", flexDirection: "column", gap: "1.35rem" }}>
            <PipelineBar series={series} emptyNote="No open loans right now." />
            <Meter
              label="Fleet in use"
              detail={`${summary.checkedOut} of ${summary.activeEquipment} active assets checked out`}
              ratio={utilisation}
              color={summary.overdue > 0 ? "var(--series-checkedout)" : "var(--brand)"}
            />
            <p className="figure__note">
              Overdue loans are counted inside “checked out” by Java, so the bar shows where each loan sits rather than a
              sum of the three numbers.
            </p>
          </div>
        </section>

        <section className="card" aria-labelledby="attention-title">
          <header className="card__head">
            <div className="card__title">
              <Icon name="alert" size={16} />
              <div>
                <h2 id="attention-title">Needs attention</h2>
                <p className="card__sub">Longest-running overdue loans</p>
              </div>
            </div>
            {summary.overdue > 0 ? (
              <div className="card__tools">
                <button type="button" className="btn btn--sm" onClick={() => onOpenBookings("overdue")}>
                  Open queue
                  <Icon name="chevronRight" size={14} />
                </button>
              </div>
            ) : null}
          </header>
          {overdue.loading ? (
            <LoadingRows label="Loading overdue loans…" rows={3} />
          ) : overdue.error ? (
            <div className="card__body">
              <ErrorState message={overdue.error} />
            </div>
          ) : overdue.items.length === 0 ? (
            <EmptyState title="Nothing overdue" body="Every checked-out asset is still inside its return window." />
          ) : (
            <div className="attention">
              {overdue.items.map((item) => (
                <button key={item.id} type="button" className="attention__row" onClick={() => onOpenBooking(item.id)}>
                  <span className="cell-thumb" aria-hidden="true">
                    <Icon name="clock" size={15} />
                  </span>
                  <span className="attention__body">
                    <span className="attention__tag">{item.assetTag}</span>
                    <span className="attention__meta">
                      {item.equipmentName} · {item.borrower}
                    </span>
                  </span>
                  <span className="attention__late">
                    <OverdueBadge label={formatLateness(item.endAt) || "Overdue"} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card rise" aria-labelledby="env-title">
        <header className="card__head">
          <div className="card__title">
            <Icon name="shield" size={16} />
            <div>
              <h2 id="env-title">Environment</h2>
              <p className="card__sub">Where this console is pointed right now</p>
            </div>
          </div>
        </header>
        <div className="card__body">
          <dl className="defs">
            <dt>Identity</dt>
            <dd>
              Demo object id <code>{me?.objectId ?? "—"}</code> · role {me?.role ?? "—"}
            </dd>
            <dt>Entra sign-in</dt>
            <dd>
              PKCE stays disabled until an Entra tenant exists (<code>P0-01</code>).
            </dd>
            <dt>BFF endpoint</dt>
            <dd>
              <code>{bffBaseUrl}</code>
            </dd>
            <dt>Office timezone</dt>
            <dd>Africa/Johannesburg — every window below is shown in office time.</dd>
          </dl>
        </div>
      </section>
    </>
  );
}
