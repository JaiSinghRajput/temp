import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { PoolConnection } from 'mysql2/promise';

interface DbUtilOptions {
  onError?: (error: Error) => NextResponse;
}

class DbUtil {
  /**
   * Execute a database operation with automatic connection handling
   */
  async normal<T>(
    operation: () => Promise<T>,
    onError?: (error: Error) => NextResponse
  ): Promise<T | NextResponse> {
    try {
      return await operation();
    } catch (error: any) {
      console.error('Database error:', error);
      if (onError) {
        return onError(error);
      }
      return NextResponse.json(
        {
          message: 'Internal server error',
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }
  }

  /**
   * Execute a database operation with transaction support
   */
  async withTransaction<T>(
    operation: (conn: PoolConnection) => Promise<T>,
    onError?: (error: Error) => NextResponse
  ): Promise<T | NextResponse> {
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();
      const result = await operation(conn);
      await conn.commit();
      return result;
    } catch (error: any) {
      await conn.rollback();
      console.error('Database transaction error:', error);
      if (onError) {
        return onError(error);
      }
      return NextResponse.json(
        {
          message: 'Internal server error',
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    } finally {
      await conn.release();
    }
  }

  /**
   * Get a connection pool for manual operations
   */
  getPool() {
    return pool;
  }
}

export default new DbUtil();
