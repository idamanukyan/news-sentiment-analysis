-- Seed test users
-- Password: testpass123 (BCrypt hashed)

INSERT INTO users (email, password_hash, name, role, enabled) VALUES
('admin@newssentiment.am', '$2a$10$4nuHBy7r3i6JO5kySN.ZqOqpriaF/ZFVCVAcl97FQep1aJ.bTUTwC', 'Admin User', 'ADMIN', true),
('test@newssentiment.am', '$2a$10$4nuHBy7r3i6JO5kySN.ZqOqpriaF/ZFVCVAcl97FQep1aJ.bTUTwC', 'Test User', 'USER', true),
('labeler@newssentiment.am', '$2a$10$4nuHBy7r3i6JO5kySN.ZqOqpriaF/ZFVCVAcl97FQep1aJ.bTUTwC', 'Labeler User', 'LABELER', true);
