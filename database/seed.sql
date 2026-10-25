INSERT INTO hospitals (name, address, city, contact_number) VALUES
('City General Hospital', 'MG Road', 'Bengaluru', '08040001001'),
('Sunrise Medical Centre', 'Indiranagar', 'Bengaluru', '08040001002'),
('Green Valley Hospital', 'Whitefield', 'Bengaluru', '08040001003');

INSERT INTO users (full_name, email, password_hash, role, hospital_id) VALUES
('System Administrator', 'admin@organdonation.demo', 'DEMO_ONLY_NOT_A_REAL_PASSWORD_HASH', 'ADMIN', 1),
('Dr. Meera Rao', 'doctor@organdonation.demo', 'DEMO_ONLY_NOT_A_REAL_PASSWORD_HASH', 'DOCTOR', 2),
('Allocation Coordinator', 'coordinator@organdonation.demo', 'DEMO_ONLY_NOT_A_REAL_PASSWORD_HASH', 'COORDINATOR', 1);

INSERT INTO donors (full_name, age, gender, blood_group, hospital_id, consent_status) VALUES
('Aarav Sharma', 35, 'Male', 'O+', 1, 'CONSENTED'),
('Diya Nair', 42, 'Female', 'A+', 2, 'CONSENTED'),
('Kabir Reddy', 29, 'Male', 'B+', 3, 'CONSENTED'),
('Ananya Das', 38, 'Female', 'AB+', 1, 'CONSENTED'),
('Rohan Mehta', 51, 'Male', 'O-', 2, 'PENDING');

INSERT INTO organs (donor_id, organ_type, blood_group, hospital_id, status, notes) VALUES
(1, 'KIDNEY', 'O+', 1, 'AVAILABLE', 'Demo record; clinical eligibility not verified'),
(2, 'LIVER', 'A+', 2, 'AVAILABLE', 'Demo record; clinical eligibility not verified'),
(3, 'KIDNEY', 'B+', 3, 'AVAILABLE', 'Demo record; clinical eligibility not verified'),
(4, 'HEART', 'AB+', 1, 'AVAILABLE', 'Demo record; clinical eligibility not verified'),
(5, 'KIDNEY', 'O-', 2, 'UNAVAILABLE', 'Donor consent pending');

INSERT INTO recipients (full_name, age, blood_group, required_organ, medical_priority, medical_status, hospital_id) VALUES
('Ishaan Kapoor', 24, 'O+', 'KIDNEY', 5, 'ACTIVE', 1),
('Meera Iyer', 46, 'A+', 'LIVER', 4, 'ACTIVE', 2),
('Vivaan Joshi', 33, 'B+', 'KIDNEY', 3, 'ACTIVE', 3),
('Sara Khan', 19, 'AB+', 'HEART', 2, 'ACTIVE', 1),
('Arjun Pillai', 57, 'O-', 'KIDNEY', 1, 'ACTIVE', 2);

INSERT INTO waiting_list (recipient_id, organ_type, priority_score, status) VALUES
(1, 'KIDNEY', 5, 'WAITING'),
(2, 'LIVER', 4, 'WAITING'),
(3, 'KIDNEY', 3, 'WAITING'),
(4, 'HEART', 2, 'WAITING'),
(5, 'KIDNEY', 1, 'WAITING');
