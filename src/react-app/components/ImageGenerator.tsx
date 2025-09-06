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
    example: 'Perfect lighting, shadows, and reflections on'
  }
