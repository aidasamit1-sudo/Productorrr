import { useAuth } from '@getmocha/users-service/react';
import { useState, useEffect } from 'react';
import { Camera, Sparkles, Star, Users } from 'lucide-react';
import Header from '@/react-app/components/Header';
import ImageGenerator from '@/react-app/components/ImageGenerator';
import ImageGallery from '@/react-app/components/ImageGallery';
import WalletManager from '@/react-app/components/WalletManager';
import { UserStats } from '@/shared/types';

export default function Home() {
  const { user, isPending, redirectToLogin } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [, setRefreshKey] = useState(0);

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/users/me');
      if (response.ok) {
        const stats = await response.json();
        setUserStats(stats);
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    // Also refresh user stats to get updated wallet balance
    if (user) {
      fetchUserStats();
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Camera className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading PixelForge...</h2>
          <p className="text-gray-600">Please wait while we prepare your workspace.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center space-x-4 mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl flex items-center justify-center">
                <Camera className="w-10 h-10 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  PixelForge
                </h1>
                <p className="text-xl text-gray-600 mt-2">AI Product Photography Platform</p>
              </div>
            </div>

            <p className="text-xl text-gray-600 mb-12 leading-relaxed">
              Transform your basic product photos into professional marketing assets with AI.
              Generate stunning product photography without expensive equipment or studios.
            </p>

            <div className="grid md:grid-cols-3 gap-8 mb-12">
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">AI-Powered Generation</h3>
                <p className="text-gray-600">Advanced AI technology creates professional product photos in multiple styles and contexts.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Professional Quality</h3>
                <p className="text-gray-600">Generate high-resolution images up to 4K quality perfect for e-commerce and marketing.</p>
              </div>

              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Credit-Based Pricing</h3>
                <p className="text-gray-600">Pay only for what you use with our flexible credit system starting at ₹25 per generation.</p>
              </div>
            </div>

            <button
              onClick={redirectToLogin}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-2xl text-lg font-semibold hover:opacity-90 transition-opacity shadow-lg"
            >
              Get Started with Google
            </button>

            <p className="text-sm text-gray-500 mt-4">
              Sign in with Google to start generating professional product photos
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <ImageGenerator onImageGenerated={handleRefresh} />
            <ImageGallery />
          </div>
          
          <div className="space-y-8">
            {userStats && (
              <WalletManager 
                walletBalance={userStats.walletBalance} 
                onBalanceUpdate={handleRefresh}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
