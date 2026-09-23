import { useState } from "react";
import { Icon, categoryIcon } from "../components/Icon";
import { AssetStatusBadge, OverdueBadge } from "../components/Badge";
import { Pager } from "../components/Figures";
import { Drawer } from "../components/Drawer";
import { EmptyState, ErrorState, InlineError, LoadingRows } from "../components/States";
import { formatInstant, humanize } from "../format";
import type { EquipmentDetail, EquipmentListItem, OperationalStatus } from "../api";

const STATUSES: OperationalStatus[] = ["ACTIVE", "MAINTENANCE", "ARCHIVED"];

export type AssetPayload = {
  assetTag: string;
  name: string;
  category: string;
  description: string;
  location: string;
  operationalStatus: OperationalStatus;
};

type Props = {
  isAdmin: boolean;
  categories: readonly string[];
  query: string;
  onQueryChange: (value: string) => void;
  onSubmitQuery: () => void;
  category: string;
  onCategoryChange: (value: string) => void;
  checkedOutOnly: boolean;
  onCheckedOutChange: (value: boolean) => void;
  loanOverdueOnly: boolean;
  onLoanOverdueChange: (value: boolean) => void;
  reservedOnly: boolean;
  onReservedChange: (value: boolean) => void;
  onReset: () => void;
  items: EquipmentListItem[];
  total: number;
  page: number;
  pageCount: number;
  onPageChange: (next: number) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  createError: string | null;
  onCreate: (payload: AssetPayload, form: HTMLFormElement) => void;
  selected: EquipmentDetail | null;
  detailError: string | null;
  updateError: string | null;
  onOpen: (id: string) => void;
  onOpenLoan: (bookingId: string) => void;
  onCloseDetail: () => void;
  onUpdate: (id: string, payload: AssetPayload) => void;
};

function readAssetForm(form: HTMLFormElement, fallbackCategory: string): AssetPayload {
  const data = new FormData(form);
  return {
    assetTag: String(data.get("assetTag") ?? "").trim(),
    name: String(data.get("name") ?? "").trim(),
    category: String(data.get("category") ?? fallbackCategory),
    description: String(data.get("description") ?? "").trim(),
    location: String(data.get("location") ?? "").trim(),
    operationalStatus: String(data.get("operationalStatus") ?? "ACTIVE") as OperationalStatus,
  };
}

function AssetFields({ asset, categories }: { asset?: EquipmentDetail; categories: readonly string[] }) {
  return (
    <>
      <label className="field">
        Tag
        <input name="assetTag" required autoComplete="off" defaultValue={asset?.assetTag} placeholder="PHONE-011" />
      </label>
      <label className="field">
        Name
        <input name="name" required autoComplete="off" defaultValue={asset?.name} placeholder="Pixel 8 test phone" />
      </label>
      <label className="field">
        Category
        <select name="category" defaultValue={asset?.category ?? "adapter"}>
          {categories.map((value) => (
            <option key={value} value={value}>
              {humanize(value)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Location
        <input name="location" required autoComplete="off" defaultValue={asset?.location} placeholder="Level 2 · locker B" />
      </label>
      <label className="field">
        Status
        <select name="operationalStatus" defaultValue={asset?.operationalStatus ?? "ACTIVE"}>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {humanize(value)}
            </option>
          ))}
        </select>
      </label>
      <label className="field formgrid__wide">
        Description
        <input
          name="description"
          autoComplete="off"
          defaultValue={asset?.description ?? ""}
          placeholder="Optional note shown to employees"
        />
      </label>
    </>
  );
}

export function InventoryView({
  isAdmin,
  categories,
  query,
  onQueryChange,
  onSubmitQuery,
  category,
  onCategoryChange,
  checkedOutOnly,
  onCheckedOutChange,
  loanOverdueOnly,
  onLoanOverdueChange,
  reservedOnly,
  onReservedChange,
  onReset,
  items,
  total,
  page,
  pageCount,
  onPageChange,
  loading,
  error,
  onRetry,
  createError,
  onCreate,
  selected,
  detailError,
  updateError,
  onOpen,
  onOpenLoan,
  onCloseDetail,
  onUpdate,
}: Props) {
  const [createOpen, setCreateOpen] = useState(true);

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
            name="query"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            autoComplete="off"
            placeholder="Tag, name or location"
          />
        </label>

        <div className="chips" role="group" aria-label="Category">
          <span className="chips__label">Category</span>
          <button
            type="button"
            className="chip"
            aria-pressed={category === ""}
            onClick={() => onCategoryChange("")}
          >
            All
          </button>
          {categories.map((value) => (
            <button
              key={value}
              type="button"
              className="chip"
              aria-pressed={category === value}
              onClick={() => onCategoryChange(value)}
            >
              <Icon name={categoryIcon(value)} size={14} />
              {humanize(value)}
            </button>
          ))}
        </div>

        <label className="switch">
          <input
            type="checkbox"
            checked={checkedOutOnly}
            onChange={(event) => onCheckedOutChange(event.target.checked)}
          />
          Checked out only
        </label>
        <label className="switch">
          <input
            type="checkbox"
            checked={loanOverdueOnly}
            onChange={(event) => onLoanOverdueChange(event.target.checked)}
          />
          Overdue loans only
        </label>
        <label className="switch">
          <input
            type="checkbox"
            checked={reservedOnly}
            onChange={(event) => onReservedChange(event.target.checked)}
          />
          Reserved only
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

      {isAdmin ? (
        <section className="card rise">
          <header className="card__head">
            <div className="card__title">
              <Icon name="plus" size={16} />
              <div>
                <h2>Add asset</h2>
                <p className="card__sub">One row per physical item — the tag is what employees scan.</p>
              </div>
            </div>
            <div className="card__tools">
              <button
                type="button"
                className="btn btn--ghost btn--sm collapse__btn"
                aria-expanded={createOpen}
                onClick={() => setCreateOpen((open) => !open)}
              >
                {createOpen ? "Hide form" : "Show form"}
                <Icon name="chevronDown" size={14} />
              </button>
            </div>
          </header>
          {createOpen ? (
            <div className="card__body">
              <form
                className="formgrid create"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  onCreate(readAssetForm(form, "adapter"), form);
                }}
              >
                <AssetFields categories={categories} />
                <div className="formgrid__actions">
                  <button type="submit" className="btn btn--brand">
                    <Icon name="check" size={15} />
                    Create
                  </button>
                  <span className="cell-sub">Java validates the tag is unique for the tenant.</span>
                </div>
                {createError ? (
                  <div className="formgrid__wide">
                    <InlineError message={createError} />
                  </div>
                ) : null}
              </form>
            </div>
          ) : null}
        </section>
      ) : (
        <div className="alert alert--info rise">
          <Icon name="info" size={18} />
          <div className="alert__body">
            <p className="alert__msg">
              Inventory edits require an ADMIN session. Java still returns <code>403 FORBIDDEN</code> for employees, so
              this view stays read-only.
            </p>
          </div>
        </div>
      )}

      <section className="card rise">
        {loading ? (
          <LoadingRows label="Loading inventory…" />
        ) : error ? (
          <div className="card__body">
            <ErrorState message={error} onRetry={onRetry} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No assets match those filters"
            body="Try a different tag or clear the category filter to see the whole catalogue, archived items included."
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
                <caption>{total} assets (including archived)</caption>
                <thead>
                  <tr>
                    <th scope="col">Tag</th>
                    <th scope="col">Asset</th>
                    <th scope="col" data-optional="true">
                      Category
                    </th>
                    <th scope="col" data-optional="true">
                      Location
                    </th>
                    <th scope="col">With</th>
                    <th scope="col">Next</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="row-link"
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
                      </td>
                      <td>
                        <span className="cell-lead">
                          <span className="cell-thumb" aria-hidden="true">
                            <Icon name={categoryIcon(item.category)} size={15} />
                          </span>
                          <span>
                            <span style={{ display: "block", fontWeight: 540 }}>{item.name}</span>
                            <span className="cell-sub cell-sub--compact">
                              {humanize(item.category)} · {item.location}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td data-optional="true">{humanize(item.category)}</td>
                      <td data-optional="true">{item.location}</td>
                      <td>
                        {item.checkedOutTo ? (
                          <span className="pillrow">
                            {item.checkedOutBookingId ? (
                              <button
                                type="button"
                                className="linkbtn"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onOpenLoan(item.checkedOutBookingId!);
                                }}
                              >
                                {item.checkedOutTo}
                              </button>
                            ) : (
                              <span>{item.checkedOutTo}</span>
                            )}
                            {item.loanOverdue ? <OverdueBadge /> : null}
                          </span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        {item.nextReservedTo && item.nextReservedBookingId ? (
                          <button
                            type="button"
                            className="linkbtn"
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpenLoan(item.nextReservedBookingId!);
                            }}
                          >
                            {item.nextReservedTo}
                          </button>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <AssetStatusBadge status={item.operationalStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} pageCount={pageCount} onChange={onPageChange} label={`${total} assets`} />
          </>
        )}
      </section>

      {detailError ? <ErrorState message={detailError} /> : null}

      {selected ? (
        <Drawer eyebrow={isAdmin ? "Edit asset" : "Asset detail"} title={selected.assetTag} onClose={onCloseDetail}>
          <div className="drawer__section">
            <div className="pillrow">
              <AssetStatusBadge status={selected.operationalStatus} />
              <span className="badge badge--plain">
                <Icon name={categoryIcon(selected.category)} size={13} />
                {humanize(selected.category)}
              </span>
            </div>
            <dl className="defs">
              {isAdmin ? null : (
                <>
                  <dt>Name</dt>
                  <dd>{selected.name}</dd>
                  <dt>Location</dt>
                  <dd>{selected.location}</dd>
                  <dt>Description</dt>
                  <dd>{selected.description?.trim() ? selected.description : <span className="muted">—</span>}</dd>
                </>
              )}
              {isAdmin ? (
                <>
                  <dt>Checked out to</dt>
                  <dd>
                    {selected.currentLoan ? (
                      <span className="pillrow">
                        <span>
                          {selected.currentLoan.borrower} · until {formatInstant(selected.currentLoan.endAt)}
                        </span>
                        {selected.currentLoan.overdue ? <OverdueBadge /> : null}
                      </span>
                    ) : (
                      <span className="muted">Not checked out</span>
                    )}
                  </dd>
                  <dt>Next reservation</dt>
                  <dd>
                    {selected.nextReservation ? (
                      <button
                        type="button"
                        className="linkbtn"
                        onClick={() => onOpenLoan(selected.nextReservation!.bookingId)}
                      >
                        {selected.nextReservation.borrower} · {formatInstant(selected.nextReservation.startAt)}
                      </button>
                    ) : (
                      <span className="muted">None</span>
                    )}
                  </dd>
                </>
              ) : null}
              <dt>Asset id</dt>
              <dd>
                <code>{selected.id}</code>
              </dd>
            </dl>
          </div>

          {isAdmin ? (
            <div className="drawer__section">
              <h3>Edit {selected.assetTag}</h3>
              <form
                key={`${selected.id}-${selected.operationalStatus}-${selected.location}`}
                className="formgrid create"
                onSubmit={(event) => {
                  event.preventDefault();
                  onUpdate(selected.id, readAssetForm(event.currentTarget, selected.category));
                }}
              >
                <AssetFields asset={selected} categories={categories} />
                <div className="formgrid__actions">
                  <button type="submit" className="btn btn--primary">
                    Save changes
                  </button>
                  <button type="button" className="btn btn--ghost" onClick={onCloseDetail}>
                    Cancel
                  </button>
                </div>
                {updateError ? (
                  <div className="formgrid__wide">
                    <InlineError message={updateError} />
                  </div>
                ) : null}
              </form>
            </div>
          ) : null}
        </Drawer>
      ) : null}
    </>
  );
}
