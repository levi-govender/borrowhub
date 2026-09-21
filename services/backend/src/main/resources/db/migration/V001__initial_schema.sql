-- BorrowHub initial schema.
-- Intervals are half-open [start_at, end_at). Overlap is evaluated in the service after locking equipment.

create table app_user (
    id uuid primary key default gen_random_uuid(),
    tenant_id text not null,
    object_id text not null,
    display_name text not null,
    email text not null,
    created_at timestamptz not null default now(),
    constraint app_user_tenant_object_unique unique (tenant_id, object_id)
);

create table equipment (
    id uuid primary key default gen_random_uuid(),
    asset_tag text not null,
    name text not null,
    category text not null,
    description text,
    location text not null,
    operational_status text not null,
    version bigint not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint equipment_asset_tag_unique unique (asset_tag),
    constraint equipment_status_check check (
        operational_status in ('ACTIVE', 'MAINTENANCE', 'ARCHIVED')
    )
);

create table booking (
    id uuid primary key default gen_random_uuid(),
    equipment_id uuid not null references equipment (id),
    user_id uuid not null references app_user (id),
    start_at timestamptz not null,
    end_at timestamptz not null,
    status text not null,
    collected_at timestamptz,
    returned_at timestamptz,
    cancelled_at timestamptz,
    cancellation_reason text,
    version bigint not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint booking_interval_check check (end_at > start_at),
    constraint booking_status_check check (
        status in ('RESERVED', 'CHECKED_OUT', 'CANCELLED', 'RETURNED')
    )
);

create unique index booking_one_checked_out_per_equipment
    on booking (equipment_id)
    where status = 'CHECKED_OUT';

create index booking_equipment_start_idx on booking (equipment_id, start_at);
create index booking_user_start_idx on booking (user_id, start_at);
create index booking_status_end_idx on booking (status, end_at);

create table audit_event (
    id uuid primary key default gen_random_uuid(),
    actor_user_id uuid references app_user (id),
    entity_type text not null,
    entity_id uuid not null,
    action text not null,
    occurred_at timestamptz not null default now(),
    correlation_id text,
    change_summary jsonb not null default '{}'::jsonb
);

create index audit_event_entity_idx
    on audit_event (entity_type, entity_id, occurred_at);

create table idempotency_record (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references app_user (id),
    route text not null,
    key text not null,
    request_hash text not null,
    response_status integer not null,
    response_body jsonb,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null,
    constraint idempotency_user_route_key_unique unique (user_id, route, key)
);
