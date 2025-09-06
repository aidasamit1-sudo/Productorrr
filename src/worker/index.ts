import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { 
  authMiddleware, 
  getOAuthRedirectUrl, 
  exchangeCodeForSessionToken,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME 
} from "@getmocha/users-service/backend";
import { setCookie, getCookie } from "hono/cookie";
import { GenerationRequestSchema, calculateCreditCost } from "@/shared/types";
import { GoogleImagenService } from "./services/googleAI";
import { StripeService } from "./services/stripe";
import { DatabaseService } from "./services/database";
import { securityHeaders, validateImageUpload, rateLimitByUser } from "./middleware/security";

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use("*", securityHeaders);
app.use("*", cors({
  origin: ["https://pixelforge.com", "https://www.pixelforge.com"],
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));

// Enhanced error handling
app.onError((error, c) => {
  console.error('API Error:', {
    message: error.message,
    stack: error.stack,
    url: c.req.url,
    method: c.req.method,
    timestamp: new Date().toISOString(),
    userAgent: c.req.header('user-agent'),
    ip: c.req.header('cf-connecting-ip')
  });

  // Log to database if possible
  try {
    const user = c.get('user');
    if (user) {
      const db = new DatabaseService(c.env.DB);
      db.logActivity(user.id, 'error', {
        error: error.message,
        url: c.req.url,
        method: c.req.method
      }, c.req.header('cf-connecting-ip'));
    }
  } catch (dbError) {
    console.error('Failed to log error to database:', dbError);
  }

  return c.json({ 
    error: c.env.NODE_ENV === 'production' 
      ? "Internal server error" 
      : error.message 
  }, 500);
});

// Health check with detailed status
app.get('/api/health', async (c) => {
  try {
    const startTime = Date.now();
    
    // Test database
    await c.env.DB.prepare("SELECT 1").first();
    const dbTime = Date.now() - startTime;
    
    // Test R2
    const r2Start = Date.now();
    await c.env.IMAGES_BUCKET.head('test');
    const r2Time = Date.now() - r2Start;
    
    return c.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        database: { status: 'connected', responseTime: `${dbTime}ms` },
        storage: { status: 'connected', responseTime: `${r2Time}ms` },
        auth: { status: 'configured' }
      },
      environment: c.env.NODE_ENV || 'development'
    });
  } catch (error) {
    return c.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

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
    const { code } = await c.req.json();

    if (!code) {
      return c.json({ error: "Authorization code required" }, 400);
    }

    const sessionToken = await exchangeCodeForSessionToken(code, {
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
    return c.json({ error: "Authentication failed" }, 500);
  }
});

// User management
app.get("/api/users/me", authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    
    const db = new DatabaseService(c.env.DB);
    
    // Ensure user exists in database
    await db.createUser({
      id: user.id,
      email: user.email,
      name: user.google_user_data?.name,
      picture: user.google_user_data?.picture
    });

    const userStats = await db.getUserStats(user.id);
    
    // Log activity
    await db.logActivity(user.id, 'profile_view', {}, c.req.header('cf-connecting-ip'));

    return c.json({
      id: user.id,
      email: user.email,
      name: userStats.name,
      picture: userStats.picture,
      walletBalance: userStats.wallet_balance || 0,
      autoRechargeEnabled: userStats.auto_recharge_enabled || false,
      autoRechargeThreshold: userStats.auto_recharge_threshold || 200,
      autoRechargeAmount: userStats.auto_recharge_amount || 1000,
      preferences: {
        defaultResolution: userStats.default_resolution || '1920x1080',
        defaultGenerationType: userStats.default_generation_type || 'lifestyle',
        notificationEmails: userStats.notification_emails !== false,
        autoEnhancePrompts: userStats.auto_enhance_prompts !== false
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return c.json({ error: "Failed to get user information" }, 500);
  }
});

// Image generation with all enhancements
app.post('/api/generate', 
  authMiddleware,
  rateLimitByUser(),
  validateImageUpload(),
  zValidator('json', GenerationRequestSchema),
  async (c) => {
    try {
      const user = c.get("user");
      if (!user) return c.json({ error: "Unauthorized" }, 401);
      
      const { prompt, resolution, generationType, productImages } = c.req.valid('json');
      const db = new DatabaseService(c.env.DB);
      
      // Calculate costs
      const creditCost = calculateCreditCost(resolution, productImages.length);
      const rupeesCost = creditCost * 25;

      // Check balance
      const userStats = await db.getUserStats(user.id);
      if (!userStats || userStats.wallet_balance < rupeesCost) {
        return c.json({ 
          error: "Insufficient balance",
          required: rupeesCost,
          current: userStats?.wallet_balance || 0
        }, 400);
      }

      // Generate enhanced prompt
      const enhancedPrompt = enhancePromptForGeneration(prompt, generationType);
      
      // Generate image
      const googleAI = new GoogleImagenService(c.env);
      const imageUrl = await googleAI.generateImage(enhancedPrompt, resolution, productImages);
      
      const generationId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Update balance and save data in transaction
      await db.updateWalletBalance(user.id, -rupeesCost, 
        `Image generation - ${resolution} - ${creditCost} credits`);

      // Save generation record
      await c.env.DB.prepare(
        `INSERT INTO generated_images 
         (id, user_id, original_prompt, enhanced_prompt, image_url, resolution, generation_type, credits_used, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).bind(generationId, user.id, prompt, enhancedPrompt, imageUrl, resolution, generationType, creditCost).run();

      // Log credit usage
      await c.env.DB.prepare(
        `INSERT INTO credit_usage 
         (user_id, generation_id, credits_consumed, generation_type, resolution, prompt, image_url, cost_in_rupees, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      ).bind(user.id, generationId, creditCost, generationType, resolution, prompt, imageUrl, rupeesCost).run();

      // Log activity
      await db.logActivity(user.id, 'image_generated', {
        generationId,
        resolution,
        generationType,
        creditsUsed: creditCost
      }, c.req.header('cf-connecting-ip'));

      return c.json({
        id: generationId,
        imageUrl,
        creditsUsed: creditCost,
        newBalance: userStats.wallet_balance - rupeesCost,
        enhancedPrompt
      });

    } catch (error) {
      console.error('Generation error:', error);
      return c.json({ 
        error: error instanceof Error ? error.message : "Generation failed" 
      }, 500);
    }
  }
);

// Get user images with enhanced pagination
app.get('/api/images', authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    
    const page = Math.max(1, parseInt(c.req.query('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20')));
    
    const db = new DatabaseService(c.env.DB);
    const result = await db.getImages(user.id, page, limit);

    return c.json(result);
  } catch (error) {
    console.error('Get images error:', error);
    return c.json({ error: "Failed to get images" }, 500);
  }
});

// Payment endpoints with enhanced Stripe integration
app.post('/api/payment/create-checkout', authMiddleware, async (c) => {
  try {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const { amount } = await c.req.json();
    
    if (!amount || amount < 100 || amount > 100000) {
      return c.json({ error: "Amount must be between ₹100 and ₹100,000" }, 400);
    }

    const stripe = new StripeService(c.env);
    const checkoutUrl = await stripe.createCheckoutSession({
      amount,
      userId: user.id,
      userEmail: user.email,
      successUrl: `${c.env.FRONTEND_URL}/payment/success`,
      cancelUrl: `${c.env.FRONTEND_URL}/payment/cancel`
    });

    // Log payment attempt
    const db = new DatabaseService(c.env.DB);
    await db.logActivity(user.id, 'payment_initiated', { amount }, c.req.header('cf-connecting-ip'));

    return c.json({ checkoutUrl });
  } catch (error) {
    console.error('Payment creation error:', error);
    return c.json({ error: "Failed to create payment session" }, 500);
  }
});

// Enhanced Stripe webhook
app.post('/api/webhook/stripe', async (c) => {
  try {
    const signature = c.req.header('stripe-signature');
    if (!signature) {
      return c.json({ error: 'Missing signature' }, 400);
    }

    const payload = await c.req.text();
    const stripe = new StripeService(c.env);
    
    const event = stripe.verifyWebhookSignature(payload, signature);
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const userId = session.metadata.user_id;
      const amount = session.amount_total / 100;
      const baseCredits = parseInt(session.metadata.base_credits);
      const bonusCredits = parseInt(session.metadata.bonus_credits);

      const db = new DatabaseService(c.env.
