import { EmptyState, ErrorState, LoadingRows } from "../components/States";
import { humanize, formatInstant } from "../format";
import type { AuditItem } from "../api";

type Props = {
  isAdmin: boolean;
  items: AuditItem[];
  total: number;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function AuditView({ isAdmin, items, total, loading, error, onRetry }: Props) {
  if (!isAdmin) {
    return (
      <EmptyState
        title="Admins only"
        body="The audit trail lists who changed bookings and equipment. Sign in as an admin to read it."
      />
    );
  }
  if (loading && items.length === 0) {
    return <LoadingRows label="Loading audit events" />;
  }
  if (error && items.length === 0) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }
  if (items.length === 0) {
    return (
      <EmptyState
        title="No audit events yet"
        body="Creates, updates, collections, returns, and cancellations will show up here."
      />
    );
  }
  return (
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
              {item.entityType ? `${humanize(item.entityType)} ${item.entityId ?? ""}` : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
