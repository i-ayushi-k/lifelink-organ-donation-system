-- LifeLink analytics views (PostgreSQL)
-- Apply after database/schema.sql has been created.

CREATE OR REPLACE VIEW vw_waiting_list_counts AS
SELECT
    organ_type,
    COUNT(*) FILTER (WHERE status = 'WAITING') AS waiting_count,
    COUNT(*) FILTER (WHERE status = 'MATCHED') AS matched_count,
    COUNT(*) FILTER (WHERE status = 'TRANSPLANTED') AS transplanted_count,
    COUNT(*) FILTER (WHERE status = 'REMOVED') AS removed_count,
    COUNT(*) AS total_entries
FROM waiting_list
GROUP BY organ_type;

CREATE OR REPLACE VIEW vw_allocation_statistics AS
SELECT
    COUNT(*) AS total_allocations,
    COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_allocations,
    COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_allocations,
    COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_allocations,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE status = 'COMPLETED')
        / NULLIF(COUNT(*), 0),
        2
    ) AS allocation_completion_rate_percent
FROM allocations;

-- Average elapsed time from joining the waiting list to an allocation.
-- This is reported only for recipients who have a matching waiting-list
-- entry and an allocation for the same organ type.
CREATE OR REPLACE VIEW vw_average_waiting_time AS
SELECT
    wl.organ_type,
    COUNT(*) AS allocated_cases,
    ROUND(
        (AVG(EXTRACT(EPOCH FROM (a.allocated_at - wl.joined_at)) / 86400.0))::numeric,
        2
    ) AS average_wait_days
FROM waiting_list wl
JOIN recipients r ON r.recipient_id = wl.recipient_id
JOIN allocations a ON a.recipient_id = r.recipient_id
JOIN organs o ON o.organ_id = a.organ_id AND o.organ_type = wl.organ_type
WHERE a.status IN ('ACTIVE', 'COMPLETED')
  AND a.allocated_at >= wl.joined_at
GROUP BY wl.organ_type;

CREATE OR REPLACE VIEW vw_transplant_outcomes AS
SELECT
    COUNT(*) AS total_transplants,
    COUNT(*) FILTER (WHERE outcome = 'SUCCESSFUL') AS successful_transplants,
    COUNT(*) FILTER (WHERE outcome = 'UNSUCCESSFUL') AS unsuccessful_transplants,
    COUNT(*) FILTER (WHERE outcome = 'SCHEDULED') AS scheduled_transplants,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE outcome = 'SUCCESSFUL')
        / NULLIF(COUNT(*) FILTER (WHERE outcome IN ('SUCCESSFUL', 'UNSUCCESSFUL')), 0),
        2
    ) AS observed_success_rate_percent
FROM transplants;
