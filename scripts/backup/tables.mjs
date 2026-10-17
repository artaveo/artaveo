/**
 * What a backup covers — shared by `collect.mjs` (the real run) and the backup workflow's
 * self-test (`.github/workflows/backup.yml`), so both check the same tables.
 *
 * Literal lists on purpose: a bucket or table added later is a visible diff here, not a
 * silent gap in the backup or the restore test.
 */

// Every bucket this app writes to (configured on the Neon branch).
export const BUCKETS = ['media', 'inquiry-files']

// The tables a restore is checked against, row for row: every table with content, leads or
// their history. Not here, because they change while a backup runs (the run itself writes to
// them) or hold nothing worth restoring: ops_events, error_groups, rate_limit_buckets.
export const ROW_COUNT_TABLES = [
  'inquiries', 'inquiry_events', 'inquiry_attachments', 'inquiry_files', 'consultations',
  'recommendations', 'recommendation_requests',
  'articles', 'article_projects', 'article_services', 'article_related',
  'projects', 'project_sections', 'project_blocks', 'project_media', 'project_technologies', 'technologies',
  'product_sale_options', 'product_services',
  'services', 'service_process_steps', 'service_packages', 'service_addons', 'service_technologies',
  'engagement_models', 'faqs', 'media_assets', 'navigation_items', 'site_settings', 'redirects',
  'notification_outbox', 'notification_attempts', 'audit_log', 'admin_users',
]
