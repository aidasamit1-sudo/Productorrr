// src/react-app/components/PaymentModal.tsx
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

export default function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
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