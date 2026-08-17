-- ============================================================
-- New branch: فرع الكراج
--  - Work-order form behaves like فرع الصناعية (handled in code
--    by branch name, no schema change needed).
--  - Suggestion lists are copied from فرع الصناعية so the new
--    branch starts with the same dropdown content. Copies are
--    independent rows — editing one branch no longer affects
--    the other.
-- Idempotent: safe to run more than once.
-- ============================================================

do $$
declare
    ind_branch_id uuid;
    garage_branch_id uuid;
begin
    select id into ind_branch_id
    from public.branches
    where name in ('الصناعية', 'فرع الصناعية')
    limit 1;

    select id into garage_branch_id
    from public.branches
    where name in ('الكراج', 'فرع الكراج')
    limit 1;

    if garage_branch_id is null then
        insert into public.branches (name)
        values ('فرع الكراج')
        returning id into garage_branch_id;
    end if;

    if ind_branch_id is not null then
        insert into public.suggestion_lists (key, label, branch_id, items)
        select s.key, s.label, garage_branch_id, s.items
        from public.suggestion_lists s
        where s.branch_id = ind_branch_id
          and not exists (
              select 1
              from public.suggestion_lists t
              where t.branch_id = garage_branch_id
                and t.key = s.key
          );
    end if;
end $$;
