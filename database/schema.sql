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
  thumbnail_url TEXT COMMENT 'Cloudinary thumbnail URL',
  
  canvas_data JSON NOT NULL,
  
  -- Status and timestamps
  is_active BOOLEAN DEFAULT TRUE COMMENT 'Soft delete flag',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_is_active (is_active),
  INDEX idx_created_at (created_at),
  INDEX idx_cloudinary_public_id (cloudinary_public_id)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Admin-created e-card templates';

CREATE TABLE user_ecards (
  -- Primary key
  id INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Reference to template
  template_id INT NOT NULL,
  
  -- User information (optional - can be extended for auth)
  user_name VARCHAR(255),
  
  -- Customized canvas data (JSON)
  -- Same structure as templates.canvas_data but with user's text changes
  customized_data JSON NOT NULL,
  
  -- Final rendered preview
  preview_url LONGTEXT COMMENT 'Base64 or Cloudinary preview URL',
  
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

SELECT 'Database setup completed successfully!' as Status;
