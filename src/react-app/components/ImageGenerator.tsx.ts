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

  const creditCost = calculateCreditCost(resolution, images.length);
  const rupeesCost = creditCost * 25;
  const canGenerate = walletBalance >= rupeesCost && images.length > 0;

  // Calculate estimated generation time based on resolution and complexity
  useEffect(() => {
    const baseTime = 15; // Base 15 seconds
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
      setError(err instanceof Error ? err.message : 'An error occurred during generation');
    } finally {
      setLoading(false);
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
              <span>Generating... ({estimatedTime}s remaining)</span>
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
              onClick={() => {/* This would open wallet manager */}}
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