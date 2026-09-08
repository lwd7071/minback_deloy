begin;
select plan(5);

select has_table('public', 'public_lookup_rate_limits', 'lookup rate table exists');
select has_function('public', 'consume_public_lookup_rate_limit', array['text'], 'lookup rate RPC exists');
select has_function('public', 'list_class_section_summaries', array['uuid', 'integer', 'integer', 'text', 'text', 'text'], 'filterable summary RPC exists');
select has_function('public', 'get_class_section_summary_facets', array['uuid', 'text'], 'summary facets RPC exists');
select has_function('public', 'bulk_upsert_evaluations', array['uuid', 'jsonb'], 'bulk evaluation RPC exists');

select * from finish();
rollback;
