export class DatabaseService {
  constructor(private db: D1Database) {}

  async createUser(userData: {
    id: string;
    email: string;
    name?: string;
    picture?: string;
  }) {
    const { success } = await this.db.prepare(
      `INSERT OR IGNORE INTO users (id, email, name, picture, wallet_balance, created_at, updated_at) 
       VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).bind(userData.id, userData.email, userData.name || null, userData.picture || null).run();

    if (success) {
      // Create default preferences
      await this.db.prepare(
        `INSERT OR IGNORE INTO user_preferences (user_id) VALUES (?)`
      ).bind(userData.id).run();
    }
  }

  async getUserStats(userId: string) {
    const { results } = await this.db.prepare(
      `SELECT u.*, up.* FROM users u 
       LEFT JOIN user_preferences up ON u.id = up.user_id 
       WHERE u.id = ?`
    ).bind(userId).all();

    return results[0];
  }

  async updateWalletBalance(userId: string, amount: number, description: string) {
    return await this.db.batch([
      this.db.prepare(
        `UPDATE users SET wallet_balance = wallet_balance + ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`
      ).bind(amount, userId),
      
      this.db.prepare(
        `INSERT INTO wallet_transactions 
         (user_id, type, amount, balance_after, description, created_at, updated_at)
         VALUES (?, ?, ?, 
           (SELECT wallet_balance FROM users WHERE id = ?), 
           ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).bind(
        userId, 
        amount > 0 ? 'topup' : 'deduct', 
        Math.abs(amount), 
        userId, 
        description
      )
    ]);
  }

  async logActivity(userId: string, activityType: string, data?: any, ipAddress?: string) {
    return await this.db.prepare(
      `INSERT INTO user_activities (user_id, activity_type, activity_data, ip_address, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).bind(userId, activityType, JSON.stringify(data || {}), ipAddress || null).run();
  }

  async getImages(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    
    const [images, count] = await Promise.all([
      this.db.prepare(
        `SELECT * FROM generated_images 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`
      ).bind(userId, limit, offset).all(),
      
      this.db.prepare(
        `SELECT COUNT(*) as total FROM generated_images WHERE user_id = ?`
      ).bind(userId).first()
    ]);

    return {
      images: images.results,
      total: (count as any)?.total || 0,
      page,
      limit,
      totalPages: Math.ceil(((count as any)?.total || 0) / limit)
    };
  }
}
