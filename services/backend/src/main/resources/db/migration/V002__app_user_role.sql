-- BorrowHub user roles for Java authorization.

alter table app_user
    add column role text not null default 'EMPLOYEE';

alter table app_user
    add constraint app_user_role_check check (role in ('EMPLOYEE', 'ADMIN'));
