import { Icon } from "./Icon";
import { BookingStatusBadge, OverdueBadge } from "./Badge";
import { Drawer } from "./Drawer";
import { InlineError } from "./States";
import { formatAuditChange, type BookingDetail } from "../api";
import { formatInstant, formatLateness, humanize } from "../format";

type Props = {
  selected: BookingDetail;
  isAdmin: boolean;
  cancelError: string | null;
  cancelReason: string;
  onCancelReasonChange: (value: string) => void;
  onCancel: () => void;
  onClose: () => void;
};

export function BookingDrawer({
  selected,
  isAdmin,
  cancelError,
  cancelReason,
  onCancelReasonChange,
  onCancel,
  onClose,
}: Props) {
  return (
    <Drawer eyebrow="Booking" title={selected.assetTag} onClose={onClose}>
      <div className="drawer__section">
        <div className="pillrow">
          <BookingStatusBadge status={selected.status} />
          {selected.overdue ? <OverdueBadge label={formatLateness(selected.endAt) || "Overdue"} /> : null}
        </div>
        {selected.overdue ? (
          <div className="alert" role="status">
            <Icon name="alert" size={18} />
            <div className="alert__body">
              <p className="alert__msg">
                This loan is overdue — still <strong>checked out</strong> past the end of its window.
              </p>
            </div>
          </div>
        ) : null}
        <dl className="defs">
          <dt>Asset</dt>
          <dd>{selected.equipmentName}</dd>
          <dt>Borrower</dt>
          <dd>{selected.borrower}</dd>
          <dt>From</dt>
          <dd>{formatInstant(selected.startAt)}</dd>
          <dt>Until</dt>
          <dd>{formatInstant(selected.endAt)}</dd>
          <dt>Allowed now</dt>
          <dd>
            {selected.allowedActions.length === 0 ? (
              <span className="muted">No actions — this loan is closed.</span>
            ) : (
              <span className="pillrow">
                {selected.allowedActions.map((action) => (
                  <span className="badge badge--plain" key={action}>
                    {humanize(action)}
                  </span>
                ))}
              </span>
            )}
          </dd>
          <dt>Booking id</dt>
          <dd>
            <code>{selected.id}</code>
          </dd>
        </dl>
      </div>

      {isAdmin && selected.allowedActions.includes("CANCEL") ? (
        <div className="drawer__section">
          <h3>Cancel this reservation</h3>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onCancel();
            }}
            style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}
          >
            <label className="field">
              Cancellation reason
              <textarea
                required
                value={cancelReason}
                onChange={(event) => onCancelReasonChange(event.target.value)}
                placeholder="Why is this reservation being cancelled? The reason is written to the audit trail."
              />
            </label>
            <div>
              <button type="submit" className="btn btn--danger">
                <Icon name="close" size={15} />
                Cancel reservation
              </button>
            </div>
            {cancelError ? <InlineError message={cancelError} /> : null}
          </form>
        </div>
      ) : null}

      <div className="drawer__section">
        <h3>Audit</h3>
        {selected.audit.length === 0 ? (
          <p className="muted" style={{ fontSize: "0.875rem" }}>
            No audit events for this booking.
          </p>
        ) : (
          <ol className="timeline">
            {selected.audit.map((event) => {
              const change = formatAuditChange(event.changeSummary);
              return (
                <li className="timeline__item" key={event.id}>
                  <p className="timeline__action">{humanize(event.action)}</p>
                  <p className="timeline__meta">
                    {formatInstant(event.occurredAt)} · {event.actor}
                  </p>
                  {change ? <p className="timeline__change">{change}</p> : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Drawer>
  );
}
