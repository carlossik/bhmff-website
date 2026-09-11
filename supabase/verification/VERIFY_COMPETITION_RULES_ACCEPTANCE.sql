-- Read-only checks after deploying competition rules acceptance.

select
    cr.organisation_id,
    o.name as organisation_name,
    cr.competition_id,
    c.name as competition_name,
    cr.title,
    cr.version,
    cr.requires_acceptance,
    cr.active,
    count(cra.id) as acceptance_count
from public.competition_rules cr
join public.organisations o on o.id = cr.organisation_id
join public.competitions c on c.id = cr.competition_id
left join public.competition_rule_acceptances cra
    on cra.rule_id = cr.id
   and cra.rule_version = cr.version
group by
    cr.organisation_id,
    o.name,
    cr.competition_id,
    c.name,
    cr.title,
    cr.version,
    cr.requires_acceptance,
    cr.active
order by o.name, c.name;

select
    o.name as organisation_name,
    c.name as competition_name,
    cr.title,
    cr.version,
    au.email,
    cra.role_at_acceptance,
    cra.accepted_at
from public.competition_rule_acceptances cra
join public.competition_rules cr on cr.id = cra.rule_id
join public.organisations o on o.id = cra.organisation_id
join public.competitions c on c.id = cra.competition_id
left join auth.users au on au.id = cra.user_id
order by cra.accepted_at desc
limit 100;
