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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
          <div className="flex items
