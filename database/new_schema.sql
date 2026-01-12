-- =====================================================
-- DATABASE
-- =====================================================
CREATE DATABASE IF NOT EXISTS dwh_shop_database
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE dwh_shop_database;

-- =====================================================
-- 1. IDENTITY DOMAIN
-- =====================================================

CREATE TABLE users (
  uid VARCHAR(36) PRIMARY KEY,
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(255) UNIQUE,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  status BOOLEAN DEFAULT FALSE,
  otp VARCHAR(6),
  otp_expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','editor','super_admin') DEFAULT 'admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- =====================================================
-- 2. CONTENT DOMAIN (CORE)
-- =====================================================

CREATE TABLE content_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('ecard','video') NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE ecard_templates (
  content_id BIGINT PRIMARY KEY,
  canvas_schema JSON NOT NULL,
  is_multipage BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (content_id) REFERENCES content_items(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE video_templates (
  content_id BIGINT PRIMARY KEY,
  preview_video_url TEXT NOT NULL,
  preview_thumbnail_url TEXT,
  FOREIGN KEY (content_id) REFERENCES content_items(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE content_assets (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  content_id BIGINT NOT NULL,
  asset_type ENUM('image','video','background','font','color','video_cards') NOT NULL,
  cloudinary_public_id VARCHAR(255),
  url TEXT NOT NULL,
  metadata JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (content_id) REFERENCES content_items(id) ON DELETE CASCADE,
  INDEX idx_content (content_id),
  INDEX idx_asset_type (asset_type)
) ENGINE=InnoDB;

-- =====================================================
-- 3. CATEGORY DOMAIN (UNIFIED)
-- =====================================================

CREATE TABLE categories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  category_type ENUM('card','video','gifts','dresses') NOT NULL DEFAULT 'card',
  parent_id BIGINT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE,
  INDEX idx_parent (parent_id),
  INDEX idx_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE category_links (
  category_id BIGINT NOT NULL,
  target_type ENUM('content','product') NOT NULL,
  target_id BIGINT NOT NULL,
  PRIMARY KEY (category_id, target_type, target_id),
  INDEX idx_target (target_type, target_id),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================
-- 4. COMMERCE DOMAIN
-- =====================================================

CREATE TABLE products (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  content_id BIGINT NULL,
  sku VARCHAR(100) UNIQUE,
  name VARCHAR(255),
  type ENUM('physical','digital') NOT NULL,
  metadata JSON,
  price DECIMAL(10,2) NOT NULL,
  sale_price DECIMAL(10,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- ✅ IMPORTANT: 1 content -> 1 product
  UNIQUE KEY uq_products_content (content_id),
  FOREIGN KEY (content_id) REFERENCES content_items(id) ON DELETE SET NULL,
  INDEX idx_type (type),
  INDEX idx_active (is_active)
) ENGINE=InnoDB;

CREATE TABLE product_images (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT NOT NULL,
  image_url TEXT NOT NULL,
  cloudinary_public_id VARCHAR(255),
  sort_order INT DEFAULT 0,
  is_primary BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product (product_id)
);

CREATE TABLE orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id VARCHAR(36) NULL,
  status ENUM(
    'pending',
    'paid',
    'processing',
    'shipped',
    'completed',
    'cancelled',
    'refunded'
  ) DEFAULT 'pending',
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  shipping DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  shipping_address JSON NULL,
  billing_address JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE SET NULL,
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  quantity INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  INDEX idx_order (order_id),
  INDEX idx_product (product_id)
) ENGINE=InnoDB;

CREATE TABLE payments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,

  provider VARCHAR(50) DEFAULT 'razorpay',

  -- ✅ Razorpay Order ID (ex: order_ABC123)
  provider_reference VARCHAR(255),

  -- ✅ Razorpay Payment ID (ex: pay_ABC123)
  provider_payment_id VARCHAR(255) NULL,

  -- ✅ Razorpay Signature
  provider_signature VARCHAR(255) NULL,

  -- amount stored in RUPEES (not paise)
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',

  status ENUM('pending','success','failed','refunded') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,

  INDEX idx_order (order_id),
  INDEX idx_status (status),

  -- ✅ Avoid duplicate provider order IDs
  UNIQUE KEY uq_provider_reference (provider_reference)
) ENGINE=InnoDB;

-- =====================================================
-- 5. SHIPPING (PHYSICAL PRODUCTS ONLY)
-- =====================================================

CREATE TABLE shipments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  carrier VARCHAR(100),
  tracking_number VARCHAR(255),
  status ENUM(
    'pending',
    'packed',
    'shipped',
    'delivered',
    'returned'
  ) DEFAULT 'pending',
  shipped_at TIMESTAMP NULL,
  delivered_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_order (order_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- =====================================================
-- 6. USER CUSTOMIZATION DOMAIN
-- =====================================================

CREATE TABLE user_custom_content (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  content_id BIGINT NOT NULL,
  user_id VARCHAR(36) NULL,

  -- ✅ IMPORTANT: connect customization to commerce order
  order_id BIGINT NULL,

  custom_data JSON NOT NULL,
  preview_url TEXT,
  status ENUM('draft','submitted','paid','completed') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (content_id) REFERENCES content_items(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE SET NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,

  INDEX idx_content (content_id),
  INDEX idx_user (user_id),
  INDEX idx_order (order_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;

-- =====================================================
-- DONE
-- =====================================================

SELECT 'invite_platform schema created successfully' AS status;
