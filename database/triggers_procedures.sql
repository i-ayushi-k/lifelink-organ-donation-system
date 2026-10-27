
-- ============================================================
-- LIFELINK: ORGAN DONATION SYSTEM
-- Triggers and Stored Procedure
-- PostgreSQL
-- ============================================================


-- TRIGGER 1:
-- Automatically synchronize organ and waiting-list statuses
-- whenever an allocation is inserted or its status changes.

CREATE OR REPLACE FUNCTION sync_allocation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'ACTIVE' THEN

        UPDATE organs
        SET status = 'ALLOCATED'
        WHERE organ_id = NEW.organ_id;

        UPDATE waiting_list
        SET status = 'MATCHED'
        WHERE recipient_id = NEW.recipient_id
          AND organ_type = (
              SELECT required_organ
              FROM recipients
              WHERE recipient_id = NEW.recipient_id
          )
          AND status = 'WAITING';

    ELSIF NEW.status = 'COMPLETED' THEN

        UPDATE organs
        SET status = 'TRANSPLANTED'
        WHERE organ_id = NEW.organ_id;

        UPDATE recipients
        SET medical_status = 'TRANSPLANTED'
        WHERE recipient_id = NEW.recipient_id;

        UPDATE waiting_list
        SET status = 'TRANSPLANTED'
        WHERE recipient_id = NEW.recipient_id
          AND status = 'MATCHED';

    ELSIF NEW.status = 'CANCELLED' THEN

        -- Restore availability only if no other active
        -- allocation exists for this organ.
        UPDATE organs
        SET status = 'AVAILABLE'
        WHERE organ_id = NEW.organ_id
          AND NOT EXISTS (
              SELECT 1
              FROM allocations
              WHERE organ_id = NEW.organ_id
                AND status = 'ACTIVE'
                AND allocation_id <> NEW.allocation_id
          );

        -- Restore the recipient's waiting-list entry only
        -- if they have no other active allocation.
        IF NOT EXISTS (
            SELECT 1
            FROM allocations
            WHERE recipient_id = NEW.recipient_id
              AND status = 'ACTIVE'
              AND allocation_id <> NEW.allocation_id
        ) THEN
            UPDATE waiting_list
            SET status = 'WAITING'
            WHERE recipient_id = NEW.recipient_id
              AND status = 'MATCHED';

            UPDATE recipients
            SET medical_status = 'ACTIVE'
            WHERE recipient_id = NEW.recipient_id
              AND medical_status = 'ACTIVE';
        END IF;

    END IF;

    RETURN NEW;
END;
$$;


CREATE TRIGGER trg_sync_allocation_status
AFTER INSERT OR UPDATE OF status
ON allocations
FOR EACH ROW
EXECUTE FUNCTION sync_allocation_status();


-- TRIGGER 2:
-- Prevent an organ from being marked AVAILABLE if it has
-- an active allocation or a completed transplant.

CREATE OR REPLACE FUNCTION validate_organ_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'AVAILABLE'
       AND EXISTS (
           SELECT 1
           FROM allocations
           WHERE organ_id = NEW.organ_id
             AND status IN ('ACTIVE', 'COMPLETED')
       )
    THEN
        RAISE EXCEPTION
            'Organ % cannot be marked AVAILABLE while an active allocation or completed allocation exists.',
            NEW.organ_id;
    END IF;

    RETURN NEW;
END;
$$;


CREATE TRIGGER trg_validate_organ_availability
BEFORE UPDATE OF status
ON organs
FOR EACH ROW
EXECUTE FUNCTION validate_organ_availability();


-- STORED PROCEDURE:
-- Validate and allocate an organ.
-- The unique_active_organ_allocation index in schema.sql
-- provides an additional database-level safeguard.

CREATE OR REPLACE PROCEDURE allocate_organ(
    IN p_organ_id INTEGER,
    IN p_recipient_id INTEGER,
    IN p_allocated_by INTEGER DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_organ RECORD;
    v_recipient RECORD;
    v_waiting_list_id INTEGER;
    v_allocation_id INTEGER;
    v_donor_abogroup TEXT;
    v_recipient_abogroup TEXT;
BEGIN
    -- Lock the organ to prevent concurrent allocation attempts.
    SELECT
        o.organ_id,
        o.organ_type,
        o.blood_group,
        o.status,
        d.consent_status
    INTO v_organ
    FROM organs o
    JOIN donors d ON d.donor_id = o.donor_id
    WHERE o.organ_id = p_organ_id
    FOR UPDATE OF o;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Organ % does not exist.', p_organ_id;
    END IF;

    IF v_organ.status <> 'AVAILABLE' THEN
        RAISE EXCEPTION 'Organ % is not available.', p_organ_id;
    END IF;

    IF v_organ.consent_status <> 'CONSENTED' THEN
        RAISE EXCEPTION 'Donor consent has not been recorded.';
    END IF;

    -- Lock the recipient record.
    SELECT *
    INTO v_recipient
    FROM recipients
    WHERE recipient_id = p_recipient_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Recipient % does not exist.', p_recipient_id;
    END IF;

    IF v_recipient.medical_status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'Recipient is not active.';
    END IF;

    IF v_recipient.required_organ <> v_organ.organ_type THEN
        RAISE EXCEPTION 'Required organ type does not match.';
    END IF;

    -- Require an active waiting-list entry for this organ.
    SELECT waiting_list_id
    INTO v_waiting_list_id
    FROM waiting_list
    WHERE recipient_id = p_recipient_id
      AND organ_type = v_organ.organ_type
      AND status = 'WAITING'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Recipient does not have an active waiting-list entry.';
    END IF;

    -- Simplified ABO compatibility for this educational demo.
    -- Rh positive/negative is not used in this check.
    v_donor_abogroup :=
        regexp_replace(v_organ.blood_group, '[+-]', '', 'g');

    v_recipient_abogroup :=
        regexp_replace(v_recipient.blood_group, '[+-]', '', 'g');

    IF NOT (
        v_donor_abogroup = 'O'
        OR v_donor_abogroup = v_recipient_abogroup
        OR v_donor_abogroup = 'A'
           AND v_recipient_abogroup = 'AB'
        OR v_donor_abogroup = 'B'
           AND v_recipient_abogroup = 'AB'
    ) THEN
        RAISE EXCEPTION
            'Blood groups fail the simplified demo compatibility check.';
    END IF;

    -- Create the allocation.
    -- The trigger updates the organ and waiting-list statuses.
    INSERT INTO allocations (
        organ_id,
        recipient_id,
        allocated_by,
        status,
        compatibility_notes
    )
    VALUES (
        p_organ_id,
        p_recipient_id,
        p_allocated_by,
        'ACTIVE',
        'Passed simplified educational ABO compatibility check.'
    )
    RETURNING allocation_id INTO v_allocation_id;

    RAISE NOTICE 'Allocation created successfully. Allocation ID: %',
        v_allocation_id;
END;
$$;
