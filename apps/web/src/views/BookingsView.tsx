import { Icon } from "../components/Icon";
import { Badge, BookingStatusBadge, OverdueBadge } from "../components/Badge";
import { Pager } from "../components/Figures";
import { BookingDrawer } from "../components/BookingDrawer";
import { EmptyState, ErrorState, LoadingRows } from "../components/States";
import { type BookingDetail, type BookingListItem, type BookingStatus } from "../api";
import { formatDateParts, formatLateness } from "../format";

const STATUS_FILTERS: { value: "" | BookingStatus; label: string }[] = [
  { value: "", label: "All" },
  { value: "RESERVED", label: "Reserved" },
  { value: "CHECKED_OUT", label: "Checked out" },
  { value: "RETURNED", label: "Returned" },
  { value: "CANCELLED", label: "Cancelled" },
];

type Props = {
  isAdmin: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onSubmitQuery: () => void;
  status: string;
  onStatusChange: (value: string) => void;
  overdueOnly: boolean;
  onOverdueChange: (value: boolean) => void;
  damagedOnly: boolean;
  onDamagedChange: (value: boolean) => void;
  onReset: () => void;
  items: BookingListItem[];
  total: number;
  page: number;
  pageCount: number;
  onPageChange: (next: number) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  selected: BookingDetail | null;
  detailError: string | null;
  cancelError: string | null;
  cancelReason: string;
  onCancelReasonChange: (value: string) => void;
  onCancel: () => void;
  onOpen: (id: string) => void;
  onCloseDetail: () => void;
};

export function BookingsView({
  isAdmin,
  query,
  onQueryChange,
  onSubmitQuery,
  status,
  onStatusChange,
  overdueOnly,
  onOverdueChange,
  damagedOnly,
  onDamagedChange,
  onReset,
  items,
  total,
  page,
  pageCount,
  onPageChange,
  loading,
  error,
  onRetry,
  selected,
  detailError,
  cancelError,
  cancelReason,
  onCancelReasonChange,
  onCancel,
  onOpen,
  onCloseDetail,
}: Props) {
  return (
    <>
      <form
        className="toolbar rise"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmitQuery();
        }}
      >
        <label className="field field--search toolbar__grow">
          Search
          <span className="field__icon">
            <Icon name="search" size={15} />
          </span>
          <input
            name="bookingQuery"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            autoComplete="off"
            placeholder="Tag, name, location, or borrower"
          />
        </label>

        <div className="chips" role="group" aria-label="Booking status">
          <span className="chips__label">Status</span>
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value || "all"}
              type="button"
              className="chip"
              aria-pressed={status === filter.value}
              onClick={() => onStatusChange(filter.value)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <label className="switch">
          <input type="checkbox" checked={overdueOnly} onChange={(event) => onOverdueChange(event.target.checked)} />
          Overdue only
        </label>
        <label className="switch">
          <input type="checkbox" checked={damagedOnly} onChange={(event) => onDamagedChange(event.target.checked)} />
          Damage notes only
        </label>

        <div className="toolbar__actions">
          <button type="submit" className="btn btn--primary">
            Search
          </button>
          <button type="button" className="btn" onClick={onReset}>
            <Icon name="reset" size={14} />
            Reset
          </button>
        </div>
      </form>

      <section className="card rise">
        {loading ? (
          <LoadingRows label="Loading bookings…" />
        ) : error ? (
          <div className="card__body">
            <ErrorState message={error} onRetry={onRetry} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title={
              damagedOnly
                ? "No damage notes"
                : overdueOnly
                  ? "No overdue loans"
                  : "No bookings match those filters"
            }
            body={
              overdueOnly
                ? "Every checked-out asset is still inside its return window."
                : "Widen the status filter or clear the search to see the full booking history."
            }
            action={
              <button type="button" className="btn btn--sm" onClick={onReset}>
                <Icon name="reset" size={14} />
                Reset filters
              </button>
            }
          />
        ) : (
          <>
            <div className="tablewrap">
              <table>
                <caption>{overdueOnly ? `${total} overdue loans` : `${total} bookings`}</caption>
                <thead>
                  <tr>
                    <th scope="col">Asset</th>
                    <th scope="col">Borrower</th>
                    <th scope="col">Window</th>
                    <th scope="col">Status</th>
                    <th scope="col" data-optional="true">
                      Overdue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const start = formatDateParts(item.startAt);
                    const end = formatDateParts(item.endAt);
                    return (
                      <tr
                        key={item.id}
                        className={item.overdue ? "row-link overdue" : "row-link"}
                        data-selected={selected?.id === item.id ? "true" : undefined}
                        onClick={() => onOpen(item.id)}
                      >
                        <td className="cell-tag">
                          <button
                            type="button"
                            className="linkbtn"
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpen(item.id);
                            }}
                          >
                            {item.assetTag}
                          </button>
                          <span className="cell-sub" style={{ display: "block" }}>
                            {item.equipmentName}
                          </span>
                        </td>
                        <td>{item.borrower}</td>
                        <td>
                          <span className="cell-window">
                            <span>
                              {start.date} {start.time}
                            </span>
                            <span>
                              until {end.date} {end.time}
                            </span>
                          </span>
                        </td>
                        <td>
                          <span className="pillrow">
                            <BookingStatusBadge status={item.status} />
                            {item.overdue ? <OverdueBadge label={formatLateness(item.endAt) || "Overdue"} /> : null}
                            {item.damaged ? <Badge tone="serious">Damage note</Badge> : null}
                          </span>
                        </td>
                        <td data-optional="true">{item.overdue ? "Yes" : "No"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pager
              page={page}
              pageCount={pageCount}
              onChange={onPageChange}
              label={overdueOnly ? `${total} overdue` : `${total} bookings`}
            />
          </>
        )}
      </section>

      {detailError ? <ErrorState message={detailError} /> : null}

      {selected ? (
        <BookingDrawer
          selected={selected}
          isAdmin={isAdmin}
          cancelError={cancelError}
          cancelReason={cancelReason}
          onCancelReasonChange={onCancelReasonChange}
          onCancel={onCancel}
          onClose={onCloseDetail}
        />
      ) : null}
    </>
  );
}
