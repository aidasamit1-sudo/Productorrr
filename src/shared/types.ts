import z from "zod";

export const GenerationRequestSchema = z.object({
  prompt: z.string().min(1),
  resolution: z.enum(['1024x1024', '1920x1080', '1080x1920', '2560x1440', '3840x2160']),
  generationType: z.enum(['standard', 'lifestyle', 'studio', 'seasonal', 'ecommerce']),
  productImages: z.array(z.string()).min(1).max(5), // Base64 encoded images
});

export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;

export const UserStatsSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  picture: z.string().nullable(),
  walletBalance: z.number(),
  autoRechargeEnabled: z.boolean(),
  autoRechargeThreshold: z.number(),
  autoRechargeAmount: z.number(),
});

export type UserStats = z.infer<typeof UserStatsSchema>;

export const GeneratedImageSchema = z.object({
  id: z.string(),
  originalPrompt: z.string(),
  enhancedPrompt: z.string().nullable(),
  imageUrl: z.string(),
  resolution: z.string(),
  generationType: z.string(),
  creditsUsed: z.number(),
  createdAt: z.string(),
});

export type GeneratedImage = z.infer<typeof GeneratedImageSchema>;

export const WalletTransactionSchema = z.object({
  id: z.number(),
  type: z.enum(['topup', 'deduct', 'bonus', 'refund']),
  amount: z.number(),
  creditsAdded: z.number(),
  balanceAfter: z.number(),
  description: z.string().nullable(),
  createdAt: z.string(),
});

export type WalletTransaction = z.infer<typeof WalletTransactionSchema>;

// Credit calculation utilities
export const CREDIT_COSTS = {
  resolutionMultipliers: {
    '1024x1024': 1,
    '1920x1080': 2,
    '1080x1920': 2,
    '2560x1440': 3,
    '3840x2160': 5,
  },
  additionalFeatures: {
    multiProduct: 1, // per additional product
    backgroundRemoval: 0.5,
    styleTransfer: 1,
  },
  baseCredit: 1,
  rupeesPerCredit: 25,
};

export function calculateCreditCost(
  resolution: string,
  productCount: number = 1,
  hasBackgroundRemoval: boolean = false,
  hasStyleTransfer: boolean = false
): number {
  let cost = CREDIT_COSTS.baseCredit;
  
  // Apply resolution multiplier
  const multiplier = CREDIT_COSTS.resolutionMultipliers[resolution as keyof typeof CREDIT_COSTS.resolutionMultipliers] || 1;
  cost *= multiplier;
  
  // Add multi-product cost
  if (productCount > 1) {
    cost += (productCount - 1) * CREDIT_COSTS.additionalFeatures.multiProduct;
  }
  
  // Add feature costs
  if (hasBackgroundRemoval) {
    cost += CREDIT_COSTS.additionalFeatures.backgroundRemoval;
  }
  if (hasStyleTransfer) {
    cost += CREDIT_COSTS.additionalFeatures.styleTransfer;
  }
  
  return cost;
}
