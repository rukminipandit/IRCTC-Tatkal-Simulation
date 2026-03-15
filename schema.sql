CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trains (
    id INT AUTO_INCREMENT PRIMARY KEY,
    train_number VARCHAR(10) NOT NULL,
    train_name VARCHAR(100) NOT NULL,
    source VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    departure_time VARCHAR(10),
    arrival_time VARCHAR(10),
    journey_date DATE,
    total_seats INT DEFAULT 40,
    available_seats INT DEFAULT 40,
    price DECIMAL(10,2) DEFAULT 1405.00
);

CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    train_id INT NOT NULL,
    seat_number INT,
    status VARCHAR(20) DEFAULT 'confirmed',
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (train_id) REFERENCES trains(id)
);

INSERT IGNORE INTO trains (train_number, train_name, source, destination, departure_time, arrival_time, journey_date, total_seats, available_seats, price) VALUES
('12951', 'Mumbai Rajdhani', 'Mumbai', 'Delhi', '16:35', '08:35', '2026-04-01', 40, 40, 1405.00),
('12301', 'Howrah Rajdhani', 'Kolkata', 'Delhi', '14:05', '09:55', '2026-04-01', 40, 40, 1405.00),
('12621', 'Tamil Nadu Express', 'Chennai', 'Delhi', '22:00', '07:40', '2026-04-01', 40, 40, 1405.00),
('12429', 'Lucknow Express', 'Lucknow', 'Delhi', '06:30', '12:30', '2026-04-01', 40, 40, 1405.00);