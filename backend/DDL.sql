CREATE DATABASE IF NOT EXISTS streaming CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE streaming;

CREATE TABLE IF NOT EXISTS `user` (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(70) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS watchlist (
    user_id INT NOT NULL,
    anime_id VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    poster VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, anime_id),
    FOREIGN KEY (user_id) REFERENCES `user`(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS progress (
    user_id INT NOT NULL,
    anime_id VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    poster VARCHAR(500),
    cover VARCHAR(500),
    episode INT NOT NULL DEFAULT 1,
    episode_count INT,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, anime_id),
    INDEX idx_progress_recent (user_id, updated_at),
    FOREIGN KEY (user_id) REFERENCES `user`(id) ON DELETE CASCADE
);
