// src/react-app/components/WalletManager.tsx - Updated with real payment integration
import { useState, useEffect } from 'react';
import { Wallet, Plus, TrendingUp, Clock, CreditCard } from 'lucide-react';
import { WalletTransaction } from '@/shared/types';
import PaymentModal from './PaymentModal';

interface WalletManagerProps {
  walletBalance: number;
  onBalanceUpdate: () => void;
}

export default function WalletManager({ walletBalance, onBalanceUpdate }: WalletManagerProps) {
  const [showPayment, setShowPayment] = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/wallet/transactions');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    onBalanceUpdate();
    fetchTransactions();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'topup':
        return <Plus className="w-4 h-4 text-green-600" />;
      case 'deduct':
        return <TrendingUp className="w-4 h-4 text-red-600" />;
      case 'bonus':
        return <Plus className="w-4 h-4 text-purple-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'topup':
      case 'bonus':
        return 'text-green-600';
      case 'deduct':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const availableCredits = Math.floor(walletBalance / 25);
  const isLowBalance = availableCredits < 5;

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Wallet</h2>
              <p className="text-sm text-gray-500">Manage your credits</p>
            </div>
          </div>
          <button
            onClick={() => setShowPayment(true)}
            className="bg-gradient-to-r from-green-600 to-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center space-x-2"
          >
            <CreditCard className="w-4 h-4" />
            <span>Add Credits</span>
          </button>
        </div>

        <div className={`rounded-xl p-6 mb-6 ${
          isLowBalance 
            ? 'bg-gradient-to-r from-red-50 to-orange-50 border border-red-200' 
            : 'bg-gradient-to-r from-purple-50 to-blue-50'
        }`}>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Current Balance</p>
            <p className="text-3xl font-bold text-gray-900">₹{walletBalance.toFixed(2)}</p>
            <div className="flex items-center justify-center space-x-4 mt-2">
              <p className="text-sm text-gray-500">
                {availableCredits} credits available
              </p>
              {isLowBalance && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                  Low Balance
                </span>
              )}
            </div>
          </div>
        </div>

        {isLowBalance && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-xs">!</span>
              </div>
              <div>
                <p className="text-sm font-medium text-red-800">Low credit balance</p>
                <p className="text-xs text-red-600">
                  Add more credits to continue generating images
                </p>
              </div>
            </div>
          </div>
        )}

        {transactions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
              <button
                onClick={fetchTransactions}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                Refresh
              </button>
            </div>
            <div className="space-y-3">
              {transactions.slice(0, 5).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getTransactionIcon(transaction.type)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(transaction.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${getTransactionColor(transaction.type)}`}>
                      {transaction.type === 'deduct' ? '-' : '+'}₹{Math.abs(transaction.amount).toFixed(2)}
                    </p>
                    {transaction.creditsAdded > 0 && (
                      <p className="text-xs text-green-600">
                        +{transaction.creditsAdded} credits
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {transactions.length > 5 && (
              <div className="text-center mt-4">
                <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                  View All Transactions
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
}