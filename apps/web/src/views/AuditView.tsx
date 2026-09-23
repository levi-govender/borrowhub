import { Pager } from "../components/Figures";
import { EmptyState, ErrorState, LoadingRows } from "../components/States";
import { humanize, formatInstant } from "../format";
import type { AuditItem } from "../api";

const ACTIONS = [
  "BOOKING_CREATED",
  "BOOKING_COLLECTED",
  "BOOKING_RETURNED",
  "BOOKING_CANCELLED",
  "BOOKING_CANCELLED_ADMIN",
  "EQUIPMENT_CREATED",
  "EQUIPMENT_UPDATED",
] as const;

const RECORD_TYPES = [
  { value: "", label: "All records" },
  { value: "booking", label: "Bookings" },
  { value: "equipment", label: "Equipment" },
] as const;

type Props = {
  isAdmin: boolean;
  action: string;
  entityType: string;
  onActionChange: (value: string) => void;
  onEntityTypeChange: (value: string) => void;
  items: AuditItem[];
  total: number;
  page: number;
  pageCount: number;
  onPageChange: (next: number) => void;
  onOpen: (item: AuditItem) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function AuditView({
  isAdmin,
  action,
  entityType,
  onActionChange,
  onEntityTypeChange,
  items,
  total,
  page,
  pageCount,
  onPageChange,
  onOpen,
  loading,
  error,
  onRetry,
}: Props) {
  if (!isAdmin) {
    return (
      <EmptyState
        title="Admins only"
        body="The audit trail lists who changed bookings and equipment. Sign in as an admin to read it."
      />
    );
  }
  return (
    <>
      <div className="toolbar">
        <label>
          Action
          <select value={action} onChange={(event) => onActionChange(event.target.value)}>
            <option value="">All actions</option>
            {ACTIONS.map((value) => (
              <option key={value} value={value}>
                {humanize(value)}
              </option>
            ))}
          </select>
        </label>
        <div className="chips" role="group" aria-label="Record type">
          {RECORD_TYPES.map((filter) => (
            <button
              key={filter.value || "all"}
              type="button"
              className="chip"
              aria-pressed={entityType === filter.value}
              onClick={() => onEntityTypeChange(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      {loading && items.length === 0 ? <LoadingRows label="Loading audit events" /> : null}
      {error && items.length === 0 ? <ErrorState message={error} onRetry={onRetry} /> : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="No audit events"
          body="Nothing matches these filters. Creates, updates, collections, returns, and cancellations are recorded here."
        />
      ) : null}
      {items.length > 0 ? (
    <table>
      <caption>{total} audit events, newest first</caption>
      <thead>
        <tr>
          <th>When</th>
          <th>Action</th>
          <th>Actor</th>
          <th>Record</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id}>
            <td>{formatInstant(item.occurredAt)}</td>
            <td>{humanize(item.action)}</td>
            <td>{item.actor || "—"}</td>
            <td>
              {item.entityId && (item.entityType === "booking" || item.entityType === "equipment") ? (
                <button type="button" className="linkbtn" onClick={() => onOpen(item)}>
                  {humanize(item.entityType)}
                </button>
              ) : (
                <span>{item.entityType ? humanize(item.entityType) : "—"}</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
      ) : null}
      {total > 0 ? (
        <Pager page={page} pageCount={pageCount} onChange={onPageChange} label={`${total} audit events`} />
      ) : null}
    </>
  );
}
