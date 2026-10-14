import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_key_vendor_tracker_99824',
  
  // Google Cloud & Workspace Service Account
  googleServiceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '',
  googleServiceAccountPath: process.env.GOOGLE_SERVICE_ACCOUNT_PATH || '',
  googleSpreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || '',
  googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',

  // Fonnte WhatsApp Gateway
  fonnteToken: process.env.FONNTE_TOKEN || '',
  fonnteApiUrl: process.env.FONNTE_API_URL || 'https://api.fonnte.com/send',
  defaultWaNumber: process.env.DEFAULT_WA_NUMBER || '',

  // Default App Settings
  defaultMaxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
  defaultTimezone: process.env.TIMEZONE || 'Asia/Jakarta',

  // Admin Initial Seed
  adminInitialUsername: process.env.ADMIN_INITIAL_USERNAME || 'admin',
  adminInitialPassword: process.env.ADMIN_INITIAL_PASSWORD || 'admin123',
};
