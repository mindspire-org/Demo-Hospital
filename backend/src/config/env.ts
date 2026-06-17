import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '4000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hms',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-for-dev',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  BACKUP_DIR: process.env.BACKUP_DIR || './backups',
  SUPER_ADMIN_MASTER_KEY: process.env.SUPER_ADMIN_MASTER_KEY || '',
  BACKUP_RETENTION_COUNT: process.env.BACKUP_RETENTION_COUNT ? parseInt(process.env.BACKUP_RETENTION_COUNT, 10) : 30,
};
