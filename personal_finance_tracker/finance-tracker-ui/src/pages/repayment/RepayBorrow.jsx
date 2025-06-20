import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Layout/DashboardLayout";
import api from "../../api/axios";
import { 
  FiArrowLeft, FiDollarSign, FiCalendar, 
  FiFileText, FiCheck 
} from "react-icons/fi";
import { FaWallet } from "react-icons/fa";

const RepayBorrow = () => {
  const { borrowId } = useParams();
  const navigate = useNavigate();
  const [borrow, setBorrow] = useState(null);
  const [formData, setFormData] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    source: "savings",
  });
  const [walletBalance, setWalletBalance] = useState(0);
  const [savingsBalance, setSavingsBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [fetchingData, setFetchingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [borrowRes, dashboardRes, savingsRes] = await Promise.all([
          api.get(`/borrows/${borrowId}`),
          api.get("/dashboard/"),
          api.get("/savings/")
        ]);

        setBorrow(borrowRes.data);
        setWalletBalance(Number(dashboardRes.data.wallet_balance || 0));

        const totalSavings = savingsRes.data.reduce((acc, item) => {
          if (item.status === "saved") {
            return acc + Number(item.amount);
          } else if (item.status === "spent") {
            return acc - Number(item.amount);
          }
          return acc;
        }, 0);
        setSavingsBalance(totalSavings);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load data. Please try again.");
      } finally {
        setFetchingData(false);
      }
    };

    fetchData();
  }, [borrowId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const amount = parseFloat(formData.amount);
    if (isNaN(amount)) {
      setError("Please enter a valid amount");
      return;
    }

    if (amount <= 0) {
      setError("Amount must be greater than zero");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    if (formData.date > today) {
      setError("Date cannot be in the future");
      return;
    }

    const remainingAmount = Number(borrow.remaining_amount ?? borrow.amount);
    if (amount > remainingAmount) {
      setError(`Amount cannot exceed remaining balance of ₹${remainingAmount.toFixed(2)}`);
      return;
    }

    const selectedBalance = formData.source === "wallet" ? walletBalance : savingsBalance;
    if (amount > selectedBalance) {
      setError(`Insufficient ${formData.source} balance. Available: ₹${selectedBalance.toFixed(2)}`);
      return;
    }

    try {
      setLoading(true);

      const response = await api.post(`/repayments/borrows/${borrowId}`, {
        amount: amount.toFixed(2),
        date: formData.date,
        source: formData.source,
        notes: formData.notes || null,
        borrow_id: parseInt(borrowId),
      });

      setMessage(`Successfully recorded repayment of ₹${amount.toFixed(2)}!`);

      // Update local balances
      if (formData.source === "wallet") {
        setWalletBalance(prev => prev - amount);
      } else {
        const savingsRes = await api.get("/savings/");
        const updatedSavingsBalance = savingsRes.data.reduce((acc, item) => {
          if (item.status === "saved") {
            return acc + Number(item.amount);
          } else if (item.status === "spent") {
            return acc - Number(item.amount);
          }
          return acc;
        }, 0);
        setSavingsBalance(updatedSavingsBalance);
      }

      // Update borrow status
      const newRemainingAmount = remainingAmount - amount;
      setBorrow(prev => ({
        ...prev,
        remaining_amount: newRemainingAmount,
        status: newRemainingAmount <= 0 ? "settled" : prev.status
      }));

      setFormData({
        amount: "",
        date: today,
        notes: "",
        source: "savings",
      });

      setTimeout(() => {
        navigate("/borrow/view");
      }, 2000);
    } catch (err) {
      console.error("Repayment error:", err);
      setError(err.response?.data?.detail || "Failed to record repayment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </DashboardLayout>
    );
  }

  if (!borrow) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto p-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <p className="text-red-600 mb-4">Borrow record not found</p>
            <button
              onClick={() => navigate("/borrow/view")}
              className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 transition duration-200"
            >
              <FiArrowLeft className="mr-2" /> Back to Borrows
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const remainingAmount = Number(borrow.remaining_amount ?? borrow.amount);

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              Repay Borrow to {borrow.person}
            </h2>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 rounded">
                <p>{error}</p>
              </div>
            )}
            
            {message && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 text-green-700 dark:text-green-300 rounded">
                <p>{message}</p>
              </div>
            )}

            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-300">Original Amount:</p>
                  <p className="font-semibold">₹{Number(borrow.amount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-300">Remaining:</p>
                  <p className="font-semibold text-red-600">₹{remainingAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-300">Wallet Balance:</p>
                  <p className="font-semibold">₹{walletBalance.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-300">Savings Balance:</p>
                  <p className="font-semibold">₹{savingsBalance.toFixed(2)}</p>
                </div>
              </div>
              {borrow.status === "settled" && (
                <p className="text-green-600 font-semibold mt-2">Status: Settled</p>
              )}
            </div>

            {remainingAmount <= 0 ? (
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-green-600 font-semibold">
                  This borrow has been fully repaid!
                </p>
                <button
                  onClick={() => navigate("/borrow/view")}
                  className="mt-4 flex items-center justify-center px-4 py-2 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 transition duration-200"
                >
                  <FiArrowLeft className="mr-2" /> Back to Borrows
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FiDollarSign className="inline mr-1" /> Amount (₹)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500">₹</span>
                    </div>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                      placeholder="0.00"
                      min="0.01"
                      step="0.01"
                      max={remainingAmount}
                      required
                      onWheel={(e) => e.target.blur()}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Maximum: ₹{remainingAmount.toFixed(2)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FiCalendar className="inline mr-1" /> Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FaWallet className="inline mr-1" /> Payment Source
                  </label>
                  <select
                    name="source"
                    value={formData.source}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                    required
                  >
                    <option value="savings">Savings (₹{savingsBalance.toFixed(2)})</option>
                    <option value="wallet">Wallet (₹{walletBalance.toFixed(2)})</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FiFileText className="inline mr-1" /> Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                    rows="3"
                    placeholder="Additional details about this repayment..."
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition duration-200 transform hover:scale-105"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <FiCheck className="mr-2" /> Submit Repayment
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RepayBorrow;