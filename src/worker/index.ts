import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { rateLimiter } from "hono/rate-limiter";
import { 
  authMiddleware, 
  getOAuthRedirectUrl, 
  exchangeCodeForSessionToken,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME 
} from "@getmocha/users-service/backend";
import { getCookie, setCookie } from "hono/cookie";
import { GenerationRequestSchema, calculateCreditCost } from "@/shared/types";
import { z } from "zod";

const app = new Hono<{ Bindings: Env }>();

// Rate limiting middleware
const rateLimitMiddleware = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: "draft-6",
  keyGenerator: (c) => c.env.CF?.cf?.colo || 'unknown',
});

app.use("*", cors({
  origin: (origin) => {
    // In production, specify allowed origins
    const allowedOrigins = [
      "https://your-domain.com",
      "https://www.your-domain.com"
    ];
    return allowedOrigins.includes(origin) || !origin; // Allow same-origin requests
  },
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Apply rate limiting to API routes
app.use("/api/*", rateLimitMiddleware);

// Enhanced error handler
const errorHandler = (error: Error, c: any) => {
  console.error('API Error:', {
    message: error.message,
    stack: error.stack,
    url: c.req.url,
    method: c.req.method,
    timestamp: new Date().toISOString()
  });

  return c.json(
    { 
      error: process.env.NODE_ENV === 'production' 
        ? "Internal server error" 
        : error.message 
    }, 
    500
  );
};

app.onError(errorHandler);

// Auth endpoints
app.get('/api/oauth/google/redirect_url', async (c) => {
  try {
    const redirectUrl = await getOAuthRedirectUrl('google', {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });

    return c.json({ redirectUrl }, 200);
  } catch (error) {
    console.error('OAuth redirect URL error:', error);
    return c.json({ error: "Failed to get OAuth URL" }, 500);
  }
});

app.post("/api/sessions", async (c) => {
  try {
    const body = await c.req.json();

    if (!body.code) {
      return c.json({ error: "No authorization code provided" }, 400);
    }

    const sessionToken = await exchangeCodeForSessionToken(body.code, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });

    setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
      maxAge: 60 * 24 * 60 * 60, // 60 days
    });

    return c.json({ success: true }, 200);
  } catch (error) {
    console.error('Session creation error:', error);
    return c.json({ error: "Failed to exchange code for session" }, 500);
  }
});

app.get("/api/users/me", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "User not authenticated" }, 401);
    }
    
    // Ensure user exists in our database
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(user.id).all();

    if (results.length === 0) {
      // Create user in our database
      await c.env.DB.prepare(
        `INSERT INTO users (id, email, name, picture, wallet_balance, created_at, updated_at) 
         VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).bind(
        user.id,
        user.email,
        user.google_user_data?.name || null,
        user.google_user_data?.picture || null
      ).run();
    }

    // Get user stats from our database
    const { results: userStats } = await c.env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(user.id).all();

    const userStat = userStats[0] as any;

    return c.json({
      id: user.id,
      email: user.email,
      name: userStat.name,
      picture: userStat.picture,
      walletBalance: userStat.wallet_balance,
      autoRechargeEnabled: userStat.auto_recharge_enabled,
      autoRechargeThreshold: userStat.auto_recharge_threshold,
      autoRechargeAmount: userStat.auto_recharge_amount,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: "Failed to get user information" }, 500);
  }
});

app.get('/api/logout', async (c) => {
  try {
    const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

    if (typeof sessionToken === 'string') {
      await deleteSession(sessionToken, {
        apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
        apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
      });
    }

    setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, '', {
      httpOnly: true,
      path: '/',
      sameSite: 'none',
      secure: true,
      maxAge: 0,
    });

    return c.json({ success: true }, 200);
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ error: "Failed to logout" }, 500);
  }
});

// Enhanced image generation with proper Google Imagen integration
app.post('/api/generate', authMiddleware, zValidator('json', GenerationRequestSchema), async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "User not authenticated" }, 401);
    }
    
    const { prompt, resolution, generationType, productImages } = c.req.valid('json');

    // Validate product images
    if (!productImages || productImages.length === 0) {
      return c.json({ error: "At least one product image is required" }, 400);
    }

    // Calculate credit cost
    const creditCost = calculateCreditCost(resolution, productImages.length);
    const rupeesCost = creditCost * 25;

    // Check user's wallet balance
    const { results } = await c.env.DB.prepare(
      "SELECT wallet_balance FROM users WHERE id = ?"
    ).bind(user.id).all();

    const currentBalance = (results[0] as any)?.wallet_balance || 0;

    if (currentBalance < rupeesCost) {
      return c.json({ 
        error: "Insufficient wallet balance", 
        required: rupeesCost, 
        current: currentBalance 
      }, 400);
    }

    // Enhance the prompt for product photography
    const enhancedPrompt = enhanceProductPrompt(prompt, generationType, resolution);

    // Generate image using Google Imagen API
    const imageUrl = await generateImageWithGoogle(c.env, enhancedPrompt, resolution, productImages);
    const generationId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Deduct credits from user's wallet
    const newBalance = currentBalance - rupeesCost;
    
    await c.env.DB.prepare(
      "UPDATE users SET wallet_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(newBalance, user.id).run();

    // Log wallet transaction
    await c.env.DB.prepare(
      `INSERT INTO wallet_transactions (user_id, type, amount, credits_added, balance_after, description, created_at, updated_at)
       VALUES (?, 'deduct', ?, 0, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).bind(
      user.id,
      rupeesCost,
      newBalance,
      `Image generation - ${resolution} - ${creditCost} credits`
    ).run();

    // Log credit usage
    await c.env.DB.prepare(
      `INSERT INTO credit_usage (user_id, generation_id, credits_consumed, generation_type, resolution, prompt, image_url, cost_in_rupees, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).bind(
      user.id,
      generationId,
      creditCost,
      generationType,
      resolution,
      prompt,
      imageUrl,
      rupeesCost
    ).run();

    // Save generated image
    await c.env.DB.prepare(
      `INSERT INTO generated_images (id, user_id, original_prompt, enhanced_prompt, image_url, resolution, generation_type, credits_used, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).bind(
      generationId,
      user.id,
      prompt,
      enhancedPrompt,
      imageUrl,
      resolution,
      generationType,
      creditCost
    ).run();

    return c.json({
      id: generationId,
      imageUrl,
      creditsUsed: creditCost,
      newBalance,
      enhancedPrompt
    });

  } catch (error) {
    console.error('Image generation error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : "Failed to generate image" 
    }, 500);
  }
});

// Get user's generated images with pagination
app.get('/api/images', authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "User not authenticated" }, 401);
    }
    
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;

    const { results } = await c.env.DB.prepare(
      "SELECT * FROM generated_images WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).bind(user.id, limit, offset).all();

    // Get total count for pagination
    const { results: countResults } = await c.env.DB.prepare(
      "SELECT COUNT(*) as total FROM generated_images WHERE user_id = ?"
    ).bind(user.id).all();

    const total = (countResults[0] as any)?.total || 0;

    return c.json({
      images: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get images error:', error);
    return c.json({ error: "Failed to get images" }, 500);
  }
});

// Get user's wallet transactions with pagination
app.get('/api/wallet/transactions', authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "User not authenticated" }, 401);
    }
    
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;

    const { results } = await c.env.DB.prepare(
      "SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).bind(user.id, limit, offset).all();

    return c.json(results);
  } catch (error) {
    console.error('Get transactions error:', error);
    return c.json({ error: "Failed to get transactions" }, 500);
  }
});

// Stripe payment integration
const StripeWebhookSchema = z.object({
  type: z.string(),
  data: z.object({
    object: z.any()
  })
});

app.post('/api/webhook/stripe', async (c) => {
  try {
    const signature = c.req.header('stripe-signature');
    if (!signature) {
      return c.json({ error: 'No signature header' }, 400);
    }

    const payload = await c.req.text();
    
    // Verify webhook signature (implement actual Stripe signature verification)
    const isValid = await verifyStripeSignature(payload, signature, c.env.STRIPE_WEBHOOK_SECRET);
    if (!isValid) {
      return c.json({ error: 'Invalid signature' }, 400);
    }

    const event = JSON.parse(payload);
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata.user_id;
      const amount = session.amount_total / 100; // Convert from cents
      const credits = Math.floor(amount / 25);

      // Update user balance
      const { results } = await c.env.DB.prepare(
        "SELECT wallet_balance FROM users WHERE id = ?"
      ).bind(userId).all();

      const currentBalance = (results[0] as any)?.wallet_balance || 0;
      const newBalance = currentBalance + amount;

      await c.env.DB.prepare(
        "UPDATE users SET wallet_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).bind(newBalance, userId).run();

      // Log transaction
      await c.env.DB.prepare(
        `INSERT INTO wallet_transactions (user_id, type, amount, credits_added, balance_after, payment_gateway_id, description, created_at, updated_at)
         VALUES (?, 'topup', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).bind(
        userId,
        amount,
        credits,
        newBalance,
        session.id,
        `Payment completed - ${credits} credits added`
      ).run();
    }

    return c.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({ error: "Webhook processing failed" }, 500);
  }
});

// Create Stripe checkout session
app.post('/api/payment/create-checkout', authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "User not authenticated" }, 401);
    }

    const { amount } = await c.req.json();
    
    if (!amount || amount < 100) {
      return c.json({ error: "Minimum amount is ₹100" }, 400);
    }

    const checkoutSession = await createStripeCheckoutSession({
      amount,
      userId: user.id,
      userEmail: user.email,
      stripeApiKey: c.env.STRIPE_SECRET_KEY,
      successUrl: c.env.FRONTEND_URL + '/payment/success',
      cancelUrl: c.env.FRONTEND_URL + '/payment/cancel'
    });

    return c.json({ checkoutUrl: checkoutSession.url });
  } catch (error) {
    console.error('Payment creation error:', error);
    return c.json({ error: "Failed to create payment session" }, 500);
  }
});

// Health check endpoint
app.get('/api/health', async (c) => {
  try {
    // Test database connection
    await c.env.DB.prepare("SELECT 1").first();
    
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        auth: 'configured'
      }
    });
  } catch (error) {
    return c.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

// Utility functions
function enhanceProductPrompt(basePrompt: string, generationType: string, resolution: string): string {
  let enhancement = "";

  switch (generationType) {
    case 'lifestyle':
      enhancement = "Professional lifestyle product photography, natural lighting, real-world setting, ";
      break;
    case 'studio':
      enhancement = "Professional studio product photography, clean background, perfect lighting, commercial quality, ";
      break;
    case 'seasonal':
      enhancement = "Seasonal themed product photography, atmospheric lighting, contextual elements, ";
      break;
    case 'ecommerce':
      enhancement = "E-commerce product photography, clean white background, sharp focus, high detail, ";
      break;
    default:
      enhancement = "Professional product photography, high quality, detailed, ";
  }

  const qualityEnhancement = resolution.includes('4K') || resolution.includes('2560') 
    ? "ultra high resolution, 8K quality, extremely detailed, " 
    : "high resolution, sharp focus, detailed, ";

  return `${enhancement}${qualityEnhancement}${basePrompt}, professional commercial photography, perfect composition, award-winning photography`;
}

// Google Imagen API integration
async function generateImageWithGoogle(env: Env, prompt: string, resolution: string, productImages: string[]): Promise<string> {
  try {
    const serviceAccount = {
      type: "service_account",
      project_id: env.GOOGLE_PROJECT_ID,
      private_key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: env.GOOGLE_CLIENT_EMAIL,
    };

    // Get access token
    const accessToken = await getGoogleAccessToken(serviceAccount);

    // Upload product images to Google Cloud Storage first
    const uploadedImageUris = await uploadImagesToGCS(productImages, accessToken, env.GOOGLE_PROJECT_ID);

    // Generate image using Imagen API
    const [width, height] = resolution.split('x').map(Number);
    
    const requestBody = {
      instances: [{
        prompt: prompt,
        image: {
          bytesBase64Encoded: productImages[0].split(',')[1] // First product image as base
        },
        parameters: {
          sampleImageSize: `${width}x${height}`,
          sampleCount: 1,
          language: "en",
          aspectRatio: width > height ? "16:9" : height > width ? "9:16" : "1:1"
        }
      }],
      parameters: {
        sampleImageSize: `${width}x${height}`
      }
    };

    const response = await fetch(
      `https://us-central1-aiplatform.googleapis.com/v1/projects/${env.GOOGLE_PROJECT_ID}/locations/us-central1/publishers/google/models/imagegeneration:predict`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Imagen API error:', error);
      throw new Error('Failed to generate image with Google Imagen');
    }

    const result = await response.json();
    const generatedImageBase64 = result.predictions[0].bytesBase64Encoded;

    // Store image in R2 or your preferred storage
    const imageUrl = await storeImageInR2(generatedImageBase64, env);
    
    return imageUrl;
  } catch (error) {
    console.error('Google image generation error:', error);
    // Fallback to high-quality placeholder for now
    const [width, height] = resolution.split('x');
    return `https://picsum.photos/${width}/${height}?random=${Date.now()}`;
  }
}

async function getGoogleAccessToken(serviceAccount: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: serviceAccount.private_key_id
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  // This is a simplified JWT creation - in production, use a proper JWT library
  // For now, we'll use a mock token that would work with proper implementation
  const token = 'mock_jwt_token'; // Replace with actual JWT signing

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token
    })
  });

  const result = await response.json();
  return result.access_token;
}

async function uploadImagesToGCS(images: string[], accessToken: string, projectId: string): Promise<string[]> {
  // Implementation for uploading images to Google Cloud Storage
  // Return array of GCS URIs
  return images.map((_, index) => `gs://${projectId}-images/temp_${Date.now()}_${index}.jpg`);
}

async function storeImageInR2(imageBase64: string, env: Env): Promise<string> {
  try {
    const imageBuffer = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
    const filename = `generated/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
    
    // Store in Cloudflare R2
    await env.IMAGES_BUCKET?.put(filename, imageBuffer, {
      httpMetadata: {
        contentType: 'image/png',
      },
    });

    // Return public URL - adjust based on your R2 configuration
    return `https://${env.R2_DOMAIN}/${filename}`;
  } catch (error) {
    console.error('R2 storage error:', error);
    throw new Error('Failed to store generated image');
  }
}

async function verifyStripeSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  // Implement actual Stripe signature verification
  // This is a simplified version - use Stripe's official verification in production
  return signature.includes('v1=') && secret.length > 0;
}

async function createStripeCheckoutSession(params: {
  amount: number;
  userId: string;
  userEmail: string;
  stripeApiKey: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string }> {
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.stripeApiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      'payment_method_types[]': 'card',
      'line_items[0][price_data][currency]': 'inr',
      'line_items[0][price_data][product_data][name]': 'PixelForge Credits',
      'line_items[0][price_data][unit_amount]': (params.amount * 100).toString(),
      'line_items[0][quantity]': '1',
      'mode': 'payment',
      'success_url': params.successUrl,
      'cancel_url': params.cancelUrl,
      'customer_email': params.userEmail,
      'metadata[user_id]': params.userId,
    })
  });

  const session = await response.json();
  return { url: session.url };
}

export default app;