-- WHA SOL — 005 : restore the error-code upsert constraint
-- taxonomyApi.saveErrorCode() uses onConflict: "brand,code".
-- The same code may exist for different brands, but not twice for one brand.
-- This migration is safe to re-run and does not delete existing records.

do $$
declare
    duplicate_rows integer;
    matching_constraint boolean;
begin
    select exists (
        select 1
        from pg_constraint c
        where c.conrelid = 'public.error_codes'::regclass
          and c.contype = 'u'
          and (
              c.conname = 'error_codes_brand_code_key'
              or pg_get_constraintdef(c.oid) = 'UNIQUE (brand, code)'
          )
    )
    into matching_constraint;

    if matching_constraint then
        return;
    end if;

    select count(*)
    into duplicate_rows
    from (
        select brand, code
        from public.error_codes
        group by brand, code
        having count(*) > 1
    ) duplicates;

    if duplicate_rows > 0 then
        raise exception
            'Cannot create error_codes_brand_code_key: duplicate (brand, code) rows already exist.';
    end if;

    alter table public.error_codes
        add constraint error_codes_brand_code_key unique (brand, code);
end;
$$;
