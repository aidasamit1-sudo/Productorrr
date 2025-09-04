// worker-configuration.d.ts - Updated with all required environment variables
interface Env {
  // Database
  DB: D1Database;
  
  // Mocha Auth Service
  MOCHA_USERS_SERVICE_API_URL: string;
  MOCHA_USERS_SERVICE_API_KEY: string;
  
  // Google Cloud AI Platform
  GOOGLE_PROJECT_ID: string;
  GOOGLE_PRIVATE_KEY: string;
  GOOGLE_CLIENT_EMAIL: string;
  GOOGLE_PRIVATE_KEY_ID: string;
  
  // Cloudflare R2 Storage
  IMAGES_BUCKET: R2Bucket;
  R2_DOMAIN: string; // Your R2 custom domain for serving images
  
  // Stripe Payment Processing
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PUBLISHABLE_KEY: string;
  
  // Application URLs
  FRONTEND_URL: string;
  API_BASE_URL: string;
  
  // Security
  JWT_SECRET: string;
  ENCRYPTION_KEY: string;
  
  // Monitoring & Analytics
  SENTRY_DSN?: string;
  POSTHOG_API_KEY?: string;
  
  // Feature Flags
  ENABLE_PAYMENT_PROCESSING: string; // "true" | "false"
  ENABLE_GOOGLE_IMAGEN: string; // "true" | "false"
  MAX_IMAGES_PER_GENERATION: string; // number as string
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: string; // milliseconds as string
  RATE_LIMIT_MAX_REQUESTS: string; // number as string
  
  // Email Service (optional)
  SENDGRID_API_KEY?: string;
  FROM_EMAIL?: string;
  
  // Cloudflare specific
  CF?: {
    cf: {
      colo: string;
      country: string;
    };
  };
}

// Environment validation schema
import { z } from 'zod';

export const EnvSchema = z.object({
  // Required
  DB: z.any(),
  MOCHA_USERS_SERVICE_API_URL: z.string().url(),
  MOCHA_USERS_SERVICE_API_KEY: z.string().min(1),
  GOOGLE_PROJECT_ID: z.string().min(1),
  GOOGLE_PRIVATE_KEY: z.string().min(1),
  GOOGLE_CLIENT_EMAIL: z.string().email(),
  IMAGES_BUCKET: z.any(),
  R2_DOMAIN: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  FRONTEND_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  
  // Optional with defaults
  ENABLE_PAYMENT_PROCESSING: z.string().default('true'),
  ENABLE_GOOGLE_IMAGEN: z.string().default('true'),
  MAX_IMAGES_PER_GENERATION: z.string().default('5'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  
  // Optional
  SENTRY_DSN: z.string().optional(),
  POSTHOG_API_KEY: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),
});

export function validateEnv(env: any): Env {
  try {
    return EnvSchema.parse(env);
  } catch (error) {
    console.error('Environment validation failed:', error);
    throw new Error('Invalid environment configuration');
  }
}