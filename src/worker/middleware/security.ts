import { Context, Next } from 'hono';
import { z } from 'zod';

export const securityHeaders = async (c: Context, next: Next) => {
  await next();
  
  // Security headers
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  if (c.env.NODE_ENV === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
};

export const validateImageUpload = (maxSize = 10 * 1024 * 1024) => {
  return async (c: Context, next: Next) => {
    const contentType = c.req.header('content-type');
    
    if (contentType?.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          // Validate file size
          if (value.size > maxSize) {
            return c.json({ error: 'File too large' }, 413);
          }
          
          // Validate file type
          if (!value.type.startsWith('image/')) {
            return c.json({ error: 'Invalid file type' }, 400);
          }
          
          // Basic image validation (check magic bytes)
          const buffer = new Uint8Array(await value.arrayBuffer());
          if (!isValidImage(buffer)) {
            return c.json({ error: 'Invalid image file' }, 400);
          }
        }
      }
    }
    
    await next();
  };
};

function isValidImage(buffer: Uint8Array): boolean {
  // Check PNG signature
  if (buffer.length >= 8 && 
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return true;
  }
  
  // Check JPEG signature
  if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xD8) {
    return true;
  }
  
  // Check WebP signature
  if (buffer.length >= 12 && 
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return true;
  }
  
  return false;
}

export const rateLimitByUser = () => {
  const attempts = new Map<string, { count: number; resetTime: number }>();
  
  return async (c: Context, next: Next) => {
    const user = c.get('user');
    if (!user) return await next();
    
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxAttempts = 10; // 10 generations per 15 minutes
    
    const key = user.id;
    const record = attempts.get(key);
    
    if (!record || now > record.resetTime) {
      attempts.set(key, { count: 1, resetTime: now + windowMs });
      return await next();
    }
    
    if (record.count >= maxAttempts) {
      return c.json({ 
        error: 'Rate limit exceeded. Please wait before generating more images.' 
      }, 429);
    }
    
    record.count++;
    await next();
  };
};
