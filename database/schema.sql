
CREATE TABLE hospitals (
    hospital_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    contact_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL
        CHECK (role IN ('ADMIN', 'DOCTOR', 'COORDINATOR')),
    hospital_id INT REFERENCES hospitals(hospital_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE donors (
    donor_id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    age INT CHECK (age BETWEEN 0 AND 120),
    gender VARCHAR(20),
    blood_group VARCHAR(3) NOT NULL
        CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    hospital_id INT NOT NULL REFERENCES hospitals(hospital_id),
    consent_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (consent_status IN ('PENDING', 'CONSENTED', 'WITHDRAWN')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE organs (
    organ_id SERIAL PRIMARY KEY,
    donor_id INT NOT NULL REFERENCES donors(donor_id),
    organ_type VARCHAR(30) NOT NULL
        CHECK (organ_type IN ('KIDNEY', 'LIVER', 'HEART', 'LUNG', 'PANCREAS', 'CORNEA')),
    blood_group VARCHAR(3) NOT NULL
        CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    hospital_id INT NOT NULL REFERENCES hospitals(hospital_id),
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE'
        CHECK (status IN ('AVAILABLE', 'ALLOCATED', 'TRANSPLANTED', 'UNAVAILABLE')),
    availability_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE TABLE recipients (
    recipient_id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    age INT CHECK (age BETWEEN 0 AND 120),
    blood_group VARCHAR(3) NOT NULL
        CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    required_organ VARCHAR(30) NOT NULL
        CHECK (required_organ IN ('KIDNEY', 'LIVER', 'HEART', 'LUNG', 'PANCREAS', 'CORNEA')),
    medical_priority INT NOT NULL DEFAULT 1
        CHECK (medical_priority BETWEEN 1 AND 5),
    medical_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (medical_status IN ('ACTIVE', 'INACTIVE', 'TRANSPLANTED')),
    hospital_id INT NOT NULL REFERENCES hospitals(hospital_id),
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE waiting_list (
    waiting_list_id SERIAL PRIMARY KEY,
    recipient_id INT NOT NULL REFERENCES recipients(recipient_id),
    organ_type VARCHAR(30) NOT NULL
        CHECK (organ_type IN ('KIDNEY', 'LIVER', 'HEART', 'LUNG', 'PANCREAS', 'CORNEA')),
    priority_score INT NOT NULL DEFAULT 1
        CHECK (priority_score BETWEEN 1 AND 5),
    status VARCHAR(20) NOT NULL DEFAULT 'WAITING'
        CHECK (status IN ('WAITING', 'MATCHED', 'REMOVED', 'TRANSPLANTED')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (recipient_id, organ_type)
);

CREATE TABLE allocations (
    allocation_id SERIAL PRIMARY KEY,
    organ_id INT NOT NULL REFERENCES organs(organ_id),
    recipient_id INT NOT NULL REFERENCES recipients(recipient_id),
    allocated_by INT REFERENCES users(user_id),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
    compatibility_notes TEXT,
    allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Prevent an organ from having more than one active allocation.
CREATE UNIQUE INDEX unique_active_organ_allocation
ON allocations(organ_id)
WHERE status = 'ACTIVE';

CREATE TABLE transplants (
    transplant_id SERIAL PRIMARY KEY,
    allocation_id INT NOT NULL UNIQUE REFERENCES allocations(allocation_id),
    transplant_date TIMESTAMP,
    hospital_id INT NOT NULL REFERENCES hospitals(hospital_id),
    outcome VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED'
        CHECK (outcome IN ('SCHEDULED', 'SUCCESSFUL', 'UNSUCCESSFUL', 'CANCELLED')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Helpful indexes for searching and matching.
CREATE INDEX idx_organs_status_type
ON organs(status, organ_type);

CREATE INDEX idx_recipients_organ_priority
ON recipients(required_organ, medical_status, medical_priority DESC);

CREATE INDEX idx_waiting_list_status_priority
ON waiting_list(status, priority_score DESC, joined_at ASC);

CREATE INDEX idx_allocations_recipient
ON allocations(recipient_id);
