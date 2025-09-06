// src/react-app/components/ImageGenerator.tsx - Enhanced version
import { useState, useEffect } from 'react';
import { Wand2, Loader2, AlertCircle, Sparkles, Info, CheckCircle } from 'lucide-react';
import { GenerationRequest, calculateCreditCost } from '@/shared/types';
import ImageUpload from './ImageUpload';

interface ImageGeneratorProps {
  onImageGenerated: () => void;
  walletBalance: number;
}

const GENERATION_TYPES = [
  { 
    value: 'standard', 
    label: 'Standard', 
    description: 'Basic product photography with clean presentation',
    example: 'Product on neutral background with professional lighting'
  },
  { 
    value: 'lifestyle', 
    label: 'Lifestyle', 
    description: 'Products in real-world settings and contexts',
    example: 'Phone on a coffee shop table, watch on a wrist'
  },
  { 
    value: 'studio', 
    label: 'Studio', 
    description: 'High-end professional studio photography',
    example: 'Perfect lighting, shadows, and reflections on white background'
  },
  { 
    value: 'seasonal', 
    label: 'Seasonal', 
    description: 'Products with seasonal themes and atmospheres',
    example: 'Christmas decorations, summer beach setting, autumn leaves'
  },
  { 
    value: 'ecommerce', 
    label: 'E-commerce', 
    description: 'Optimized for online store listings',
    example: 'Clean white background, multiple angles, detail shots'
  },
];

const RESOLUTIONS = [
  { value: '1024x1024', label: 'Square', subtitle: '1024×1024', credits: 1, recommended: false },
  { value: '1920x1080', label: 'Landscape HD', subtitle: '1920×1080', credits: 2, recommended: true },
  { value: '1080x1920', label: 'Portrait HD', subtitle: '1080×1920', credits: 2, recommended: false },
  { value: '2560x1440', label: '2K Quality', subtitle: '2560×1440', credits: 3, recommended: false },
  { value: '3840x2160', label: '4K Ultra', subtitle: '3840×2160', credits: 5, recommended: false },
];

export default function ImageGenerator({ onImageGenerated, walletBalance }: ImageGeneratorProps) {
  const [images, setImages] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState('1920x1080');
  const [generationType, setGenerationType] = useState('lifestyle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [progress, setProgress] = useState(0);

  const creditCost = calculateCreditCost(resolution, images.length);
  const rupeesCost = creditCost * 25;
  const canGenerate = walletBalance >= rupeesCost && images.length > 0;

  useEffect(() => {
    const baseTime = 15;
    const resolutionMultiplier = RESOLUTIONS.find(r => r.value === resolution)?.credits || 1;
    const imageMultiplier = Math.max(1, images.length * 0.5);
    setEstimatedTime(Math.round(baseTime * resolutionMultiplier * imageMultiplier));
  }, [resolution, images.length]);

  const getDefaultPrompt = (type: string): string => {
    const prompts = {
      lifestyle: 'Product beautifully integrated into a modern lifestyle setting with natural lighting and authentic context',
      studio: 'Professional studio product photography with perfect lighting, clean background, and commercial quality finish',
      seasonal: 'Product styled with seasonal elements creating an atmospheric and themed presentation',
      ecommerce: 'Clean e-commerce product photography optimized for online retail with clear details and neutral background',
      standard: 'Professional product photography with high quality styling and optimal presentation'
    };
    return prompts[type as keyof typeof prompts] || prompts.standard;
  };

  const handleGenerate = async () => {
    if (!canGenerate) {
      if (images.length === 0) {
        setError('Please upload at least one product image');
      } else {
        setError(`Insufficient wallet balance. You need ₹${rupeesCost} but have ₹${walletBalance.toFixed(2)}`);
      }
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setProgress(0);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + Math.random() * 15, 95));
    }, 1000);

    try {
      const finalPrompt = prompt.trim() || getDefaultPrompt(generationType);

      const generationRequest: GenerationRequest = {
        prompt: finalPrompt,
        resolution: resolution as any,
        generationType: generationType as any,
        productImages: images,
      };

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generationRequest),
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      // Clear form
      setImages([]);
      setPrompt('');
      
      // Show success message
      setSuccess(`Image generated successfully! ${creditCost} credits used.`);
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
      
      // Notify parent component
      onImageGenerated();

    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : 'An error occurred during generation');
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const selectedStyle = GENERATION_TYPES.find(type => type.value === generationType);
  const selectedResolution = RESOLUTIONS.find(res => res.value === resolution);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
          <Wand2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Generate Product Photo</h2>
          <p className="text-sm text-gray-500">Create professional product photography with AI</p>
        </div>
      </div>

      <ImageUpload 
        images={images} 
        onImagesChange={setImages}
        maxImages={5}
      />

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Description
            <span className="text-gray-400 font-normal ml-1">(Optional)</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`e.g., ${getDefaultPrompt(generationType).substring(0, 80)}...`}
            className="w-full h-24 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm"
            maxLength={500}
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-gray-500">
              {prompt.trim() ? 'Using your custom description' : 'Will use default style-based prompt'}
            </p>
            <span className="text-xs text-gray-400">{prompt.length}/500</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photography Style
            </label>
            <select
              value={generationType}
              onChange={(e) => setGenerationType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            >
              {GENERATION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
            {selectedStyle && (
              <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700">
                  <Info className="w-3 h-3 inline mr-1" />
                  Example: {selectedStyle.example}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Image Resolution
            </label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            >
              {RESOLUTIONS.map((res) => (
                <option key={res.value} value={res.value}>
                  {res.label} ({res.subtitle}) - {res.credits} credit{res.credits > 1 ? 's' : ''}
                  {res.recommended ? ' - Recommended' : ''}
                </option>
              ))}
            </select>
            {selectedResolution && (
              <div className="mt-2 p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-700">
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  Perfect for {selectedResolution.credits <= 2 ? 'social media and web use' : 'print and high-quality displays'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Generation Info Panel */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 p-4">
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600 mb-1">Cost</p>
              <p className="font-semibold text-gray-900">
                {creditCost} credit{creditCost > 1 ? 's' : ''} • ₹{rupeesCost}
              </p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Estimated Time</p>
              <p className="font-semibold text-gray-900">{estimatedTime} seconds</p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Your Balance</p>
              <p className={`font-semibold ${canGenerate ? 'text-green-600' : 'text-red-600'}`}>
                ₹{walletBalance.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {loading && (
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Generating image...</span>
              <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              This may take up to {estimatedTime} seconds...
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-xl">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading || !canGenerate}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              <span>Generate Professional Image</span>
            </>
          )}
        </button>

        {!canGenerate && walletBalance < rupeesCost && (
          <p className="text-center text-sm text-gray-600">
            Need ₹{(rupeesCost - walletBalance).toFixed(2)} more to generate this image.{' '}
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('openPaymentModal'))}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Add credits
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

// Fix 2: src/react-app/components/PaymentModal.tsx - Remove .ts extension
import { useState } from 'react';
import { CreditCard, X, Loader2 } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PAYMENT_PLANS = [
  { amount: 500, credits: 20, popular: false },
  { amount: 1000, credits: 40, popular: true, bonus: 5 },
  { amount: 2500, credits: 100, popular: false, bonus: 15 },
  { amount: 5000, credits: 200, popular: false, bonus: 50 },
];

export function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
  const [selectedPlan, setSelectedPlan] = useState(PAYMENT_PLANS[1]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payment/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: selectedPlan.amount,
          credits: selectedPlan.credits + (selectedPlan.bonus || 0),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment session');
      }

      // Redirect to Stripe checkout
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Add Credits</h3>
              <p className="text-sm text-gray-500">Choose a plan to get started</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {PAYMENT_PLANS.map((plan) => (
            <div
              key={plan.amount}
              onClick={() => setSelectedPlan(plan)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedPlan.amount === plan.amount
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${plan.popular ? 'relative' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-2 left-4 bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                  Most Popular
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="text-lg font-semibold text-gray-900">₹{plan.amount}</p>
                    {plan.bonus && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        +{plan.bonus} bonus
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {plan.credits + (plan.bonus || 0)} credits
                    {plan.bonus && (
                      <span className="text-green-600 ml-1">
                        ({plan.credits} + {plan.bonus} bonus)
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">₹{(plan.amount / plan.credits).toFixed(1)}/credit</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-gray-900 mb-2">Payment Summary</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Amount</span>
              <span className="font-medium">₹{selectedPlan.amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Base Credits</span>
              <span>{selectedPlan.credits}</span>
            </div>
            {selectedPlan.bonus && (
              <div className="flex justify-between text-green-600">
                <span>Bonus Credits</span>
                <span>+{selectedPlan.bonus}</span>
              </div>
            )}
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between font-medium">
                <span>Total Credits</span>
                <span>{selectedPlan.credits + (selectedPlan.bonus || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                <span>Pay ₹{selectedPlan.amount}</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          Secure payment powered by Stripe. Your payment information is encrypted and secure.
        </p>
      </div>
    </div>
  );
}
