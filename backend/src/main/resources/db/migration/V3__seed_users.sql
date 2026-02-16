-- Seed test users
-- Password: testpass123 (BCrypt hashed)

INSERT INTO users (email, password_hash, name, role, enabled) VALUES
('admin@newssentiment.am', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqbPHeOq8SdoF8aF0qLfuWkGGpHKG', 'Admin User', 'ADMIN', true),
('test@newssentiment.am', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqbPHeOq8SdoF8aF0qLfuWkGGpHKG', 'Test User', 'USER', true),
('labeler@newssentiment.am', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MqrqbPHeOq8SdoF8aF0qLfuWkGGpHKG', 'Labeler User', 'LABELER', true);
