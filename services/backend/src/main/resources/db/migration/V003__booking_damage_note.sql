-- Optional employee-reported condition on return. Photos stay out of scope until object storage exists.

alter table booking
    add column damage_note text;
