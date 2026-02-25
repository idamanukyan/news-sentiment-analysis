-- Demo admin user with unique password
-- Email: demo@aiim.am
-- Password: AiimDemo2026

-- Delete if exists and insert fresh
DELETE FROM users WHERE email = 'demo@aiim.am';

INSERT INTO users (email, password_hash, name, role, enabled) VALUES
('demo@aiim.am', '$2b$10$8rjSJJ241u0rZTQ4nhY.P.RCZHORKYFysxi1dyyMu3h9UrsMDdwDi', 'Demo Admin', 'ADMIN', true);
