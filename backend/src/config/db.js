import { Sequelize } from 'sequelize';
import 'dotenv/config';

const dbPass = process.env.DB_PASSWORD || process.env.DB_PASS;
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);

export const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  dbPass,
  {
    host: process.env.DB_HOST || 'localhost',
    port: dbPort,
    dialect: 'postgres',
    logging: false,
    timezone: 'America/Argentina/Buenos_Aires',
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);
