import { Icon } from "../components/Icon";
import { BookingStatusBadge, OverdueBadge } from "../components/Badge";
import { BookingDrawer } from "../components/BookingDrawer";
import { EmptyState, ErrorState, LoadingRows } from "../components/States";
import { bookingsOnDay, isOpenLoan, type OfficeWeek } from "../calendar";
import { formatDateParts, formatLateness } from "../format";
import type { BookingDetail, BookingListItem } from "../api";

type Props = {
  isAdmin: boolean;
  week: OfficeWeek;
  onPrevWeek: () => void;
  onThisWeek: () => void;
  onNextWeek: () => void;
  includeClosed: boolean;
  onIncludeClosedChange: (value: boolean) => void;
  items: BookingListItem[];
  total: number;
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

export function CalendarView({
  isAdmin,
  week,
  onPrevWeek,
  onThisWeek,
  onNextWeek,
  includeClosed,
  onIncludeClosedChange,
  items,
  total,
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
  const visible = includeClosed ? items : items.filter(isOpenLoan);

  return (
    <>
      <div className="toolbar rise">
        <div className="chips" role="group" aria-label="Calendar week">
          <span className="chips__label">Office week · Africa/Johannesburg</span>
          <button type="button" className="chip" onClick={onPrevWeek} aria-label="Previous week">
            <Icon name="chevronLeft" size={15} />
            Previous
          </button>
          <button type="button" className="chip" onClick={onThisWeek}>
            This week
          </button>
          <button type="button" className="chip" onClick={onNextWeek} aria-label="Next week">
            Next
            <Icon name="chevronRight" size={15} />
          </button>
        </div>
        <p className="calendar-range" aria-live="polite">
          {week.label}
        </p>
        <label className="switch">
          <input
            type="checkbox"
            checked={includeClosed}
            onChange={(event) => onIncludeClosedChange(event.target.checked)}
          />
          Include returned and cancelled
        </label>
      </div>

      <section className="card rise" aria-label="Booking calendar">
        {loading ? (
          <LoadingRows label="Loading calendar…" />
        ) : error ? (
          <div className="card__body">
            <ErrorState message={error} onRetry={onRetry} />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            title="Nothing booked this week"
            body={
              includeClosed
                ? "No reservations overlap this office week."
                : "No open loans overlap this office week. Include closed bookings to see history."
            }
          />
        ) : (
          <>
            <p className="calendar-caption">
              {visible.length} of {total} overlapping {total === 1 ? "booking" : "bookings"}
              {total > items.length ? " (first 100 in this window)" : ""}
            </p>
            <div className="calendar" role="grid" aria-label={`Week of ${week.label}`}>
              {week.days.map((day) => {
                const dayItems = bookingsOnDay(visible, day);
                return (
                  <div className="calendar__day" key={day.start} role="gridcell">
                    <h3>
                      <span>{day.weekday}</span>
                      <span className="calendar__date">{day.dateLabel}</span>
                    </h3>
                    {dayItems.length === 0 ? (
                      <p className="muted calendar__empty">No loans</p>
                    ) : (
                      <ul className="calendar__list">
                        {dayItems.map((item) => {
                          const start = formatDateParts(item.startAt);
                          const end = formatDateParts(item.endAt);
                          return (
                            <li key={item.id}>
                              <button
                                type="button"
                                className={item.overdue ? "calendar__loan calendar__loan--overdue" : "calendar__loan"}
                                onClick={() => onOpen(item.id)}
                              >
                                <span className="calendar__tag">{item.assetTag}</span>
                                <span className="calendar__who">{item.borrower}</span>
                                <span className="calendar__when">
                                  {start.time} – {end.time}
                                </span>
                                <span className="pillrow">
                                  <BookingStatusBadge status={item.status} />
                                  {item.overdue ? <OverdueBadge label={formatLateness(item.endAt) || "Overdue"} /> : null}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
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
