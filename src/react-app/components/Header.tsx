import { useAuth } from '@getmocha/users-service/react';
import { Camera, LogOut, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { UserStats } from '@/shared/types';

export default function Header() {
  const { user, logout, redirectToLogin } = useAuth();
  const [userStats, setUserStats] = useState<UserStats | null>(null);

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

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                PixelForge
              </h1>
              <p className="text-xs text-gray-500">AI Product Photography</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="flex items-center space-x-2 bg-gray-50 rounded-lg px-3 py-2">
                  <Wallet className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">
                    ₹{userStats?.walletBalance?.toFixed(2) || '0.00'}
                  </span>
                </div>
                
                <div className="flex items-center space-x-3">
                  {user.google_user_data?.picture && (
                    <img
                      src={user.google_user_data.picture}
                      alt={user.google_user_data.name || user.email}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">
                      {user.google_user_data?.name || user.email}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                </div>

                <button
                  onClick={logout}
                  className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <button
                onClick={redirectToLogin}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
