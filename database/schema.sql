CREATE DATABASE IF NOT EXISTS ecard_shop
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE ecard_shop;

DROP TABLE IF EXISTS user_ecards;
DROP TABLE IF EXISTS templates;

CREATE TABLE templates (
  -- Primary key
  id INT AUTO_INCREMENT PRIMARY KEY,
  -- Template information
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_image_url TEXT NOT NULL,
  cloudinary_public_id VARCHAR(255) NULL COMMENT 'Cloudinary asset ID',
  thumbnail_url VARCHAR(512) NULL COMMENT 'Cloudinary thumbnail URL (stores thumbnail_uri)',
  thumbnail_public_id VARCHAR(255) NULL COMMENT 'Cloudinary public ID for thumbnail',
  canvas_data JSON NOT NULL,
  -- Status and timestamps
  is_active BOOLEAN DEFAULT TRUE COMMENT 'Soft delete flag',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  pricing_type ENUM('free', 'premium') DEFAULT 'free' COMMENT 'Template pricing type',
  price DECIMAL(8,2) DEFAULT 0.00 COMMENT 'Price for premium templates',
  category_id INT(11) DEFAULT 1 COMMENT 'Template category ID',
  subcategory_id INT(11) DEFAULT NULL COMMENT 'Template subcategory ID',
  -- Indexes for performance
  INDEX idx_is_active (is_active),
  INDEX idx_created_at (created_at),
  INDEX idx_cloudinary_public_id (cloudinary_public_id),
  INDEX idx_category_id (category_id),
  INDEX idx_subcategory_id (subcategory_id)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Admin-created e-card templates';

CREATE TABLE user_ecards (
  -- Primary key
  id INT AUTO_INCREMENT PRIMARY KEY,
  -- Reference to template
  template_id INT NOT NULL,
  -- Public slug to make shareable, non-predictable URLs
  public_slug VARCHAR(255) UNIQUE,
  -- User information (optional - can be extended for auth)
  user_name VARCHAR(255),
  -- Customized canvas data (JSON)
  -- Same structure as templates.canvas_data but with user's text changes
  customized_data JSON NOT NULL,
  
  -- Final rendered preview
  preview_url VARCHAR(512) COMMENT 'Cloudinary preview URL',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key constraint
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  
  -- Indexes for performance
  INDEX idx_template_id (template_id),
  INDEX idx_created_at (created_at)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='User-customized e-cards';

CREATE TABLE `card_categories` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  UNIQUE KEY `uniq_name` (`name`),
  `status` int(11) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `card_subcategories` (
  `id` int(11) NOT NULL PRIMARY KEY AUTO_INCREMENT,
  `category_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  UNIQUE KEY `uniq_name_per_category` (`category_id`, `name`),
  `status` BOOLEAN NOT NULL DEFAULT 1 COMMENT '1 = active, 0 = inactive',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp(),
  FOREIGN KEY (`category_id`) REFERENCES `card_categories`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SELECT 'Database setup completed successfully!' as Status;