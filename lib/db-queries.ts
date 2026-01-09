/**
 * Database query helper utilities for new_schema
 * Centralized place for common database operations
 */

import pool from './db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// ==================== CONTENT ITEMS ====================
export async function getContentItemById(id: number | string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM content_items WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

export async function getContentItemBySlug(slug: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM content_items WHERE slug = ?',
    [slug]
  );
  return rows[0] || null;
}

// ==================== ECARDS ====================
export async function getECardTemplate(id: number | string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ci.*, et.canvas_schema, et.is_multipage
     FROM content_items ci
     LEFT JOIN ecard_templates et ON et.content_id = ci.id
     WHERE ci.id = ? AND ci.type = 'ecard'`,
    [id]
  );
  return rows[0] || null;
}

// ==================== CATEGORIES ====================
export async function getCategoryBySlug(slug: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM categories WHERE slug = ? AND parent_id IS NULL',
    [slug]
  );
  return rows[0] || null;
}

export async function getSubcategoryBySlug(slug: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM categories WHERE slug = ? AND parent_id IS NOT NULL',
    [slug]
  );
  return rows[0] || null;
}

export async function getCategoryById(id: number | string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM categories WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

export async function getAllParentCategories() {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM categories WHERE parent_id IS NULL ORDER BY name ASC'
  );
  return rows;
}

export async function getAllSubcategories(parentId?: number) {
  let query = 'SELECT * FROM categories WHERE parent_id IS NOT NULL';
  const params: any[] = [];
  
  if (parentId) {
    query += ' AND parent_id = ?';
    params.push(parentId);
  }
  
  query += ' ORDER BY name ASC';
  const [rows] = await pool.query<RowDataPacket[]>(query, params);
  return rows;
}

// ==================== USER CUSTOM CONTENT ====================
export async function getUserCustomContent(userId: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ucc.*, ci.title, ci.slug, ci.type
     FROM user_custom_content ucc
     LEFT JOIN content_items ci ON ucc.content_id = ci.id
     WHERE ucc.user_id = ?
     ORDER BY ucc.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function getUserCustomContentById(id: number | string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT ucc.*, ci.title, ci.slug, ci.type
     FROM user_custom_content ucc
     LEFT JOIN content_items ci ON ucc.content_id = ci.id
     WHERE ucc.id = ?`,
    [id]
  );
  return rows[0] || null;
}

// ==================== PRODUCTS & ORDERS ====================
export async function getProductById(id: number | string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM products WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

export async function getOrderById(id: number | string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM orders WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

export async function getOrderByNumber(orderNumber: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM orders WHERE order_number = ?',
    [orderNumber]
  );
  return rows[0] || null;
}

export async function getUserOrders(userId: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}

// ==================== PAYMENTS ====================
export async function getPaymentByOrderId(orderId: number | string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM payments WHERE order_id = ?',
    [orderId]
  );
  return rows[0] || null;
}

export async function getPaymentByReference(reference: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM payments WHERE provider_reference = ?',
    [reference]
  );
  return rows[0] || null;
}

// ==================== USERS ====================
export async function getUserByPhone(phone: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM users WHERE phone = ?',
    [phone]
  );
  return rows[0] || null;
}

export async function getUserById(uid: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM users WHERE uid = ?',
    [uid]
  );
  return rows[0] || null;
}

export async function getUserByEmail(email: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );
  return rows[0] || null;
}

// ==================== ADMINS ====================
export async function getAdminByEmail(email: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM admins WHERE email = ?',
    [email]
  );
  return rows[0] || null;
}

export async function getAdminById(id: number | string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM admins WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

export async function getAllAdmins() {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, email, role, created_at FROM admins ORDER BY email ASC'
  );
  return rows;
}
