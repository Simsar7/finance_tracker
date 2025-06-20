import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Layout/DashboardLayout";
import api from "../../api/axios";
import { FiArrowLeft, FiDollarSign, FiCalendar, FiFileText, FiCreditCard, FiCheck } from "react-icons/fi";

const ReceiveRepayment = () => {
  const { lendId } = useParams();
  const navigate = useNavigate();

  const [lend, setLend] = useState(null);
  const [formData, setFormData] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
    source: "wallet",
  });
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchLend = async () => {
      try {
        const res = await api.get(`/lends/${lendId}`);
        setLend(res.data);
      } catch (err) {
        console.error("Error fetching lend:", err);
        setError("Failed to fetch lend details");
      } finally {
        setFetching(false);
      }
    };

    if (lendId) fetchLend();
  }, [lendId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const amount = parseFloat(formData.amount);
    if (isNaN(amount)) {
      return setError("Please enter a valid amount");
    }

    if (amount <= 0) {
      return setError("Amount must be greater than zero");
    }

    const today = new Date().toISOString().split("T")[0];
    if (formData.date > today) {
      return setError("Date cannot be in the future");
    }

    const remaining = lend.remaining_amount ?? lend.amount;
    if (amount > Number(remaining)) {
      return setError(`Amount cannot exceed remaining balance of ₹${Number(remaining).toFixed(2)}`);
    }

    try {
      setLoading(true);

      await api.post(`/repayments/lends/${lendId}`, {
        amount,
        date: formData.date,
        notes: formData.notes || null,
        source: formData.source,
        lend_id: parseInt(lendId),
      });

      setMessage(`Successfully received ₹${amount.toFixed(2)} payment!`);

      const newRemaining = Number(remaining) - amount;

      setLend((prev) => ({
        ...prev,
        remaining_amount: newRemaining,
        status: newRemaining <= 0 ? "settled" : prev.status,
      }));

      setFormData({
        amount: "",
        date: today,
        notes: "",
        source: "wallet",
      });

      setTimeout(() => {
        navigate("/lend/view");
      }, 2000);
    } catch (err) {
      console.error("Receive repayment error:", err);
      setError(err.response?.data?.detail || "Failed to receive repayment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
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

  if (!lend) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto p-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
            <p className="text-red-600 mb-4">Lend record not found</p>
            <button
              onClick={() => navigate("/lend/view")}
              className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 transition duration-200"
            >
              <FiArrowLeft className="mr-2" /> Back to Lends
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const remaining = lend.remaining_amount ?? lend.amount;

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              Receive Repayment from {lend.person}
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
                  <p className="font-semibold">₹{Number(lend.amount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-300">Remaining:</p>
                  <p className="font-semibold text-red-600">₹{Number(remaining).toFixed(2)}</p>
                </div>
              </div>
              <p className={`mt-2 font-semibold ${lend.status === "settled" ? "text-green-600" : "text-yellow-600"}`}>
                Status: {lend.status}
              </p>
            </div>

            {Number(remaining) <= 0 ? (
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-green-600 font-semibold">
                  This lend has been fully repaid!
                </p>
                <button
                  onClick={() => navigate("/lend/view")}
                  className="mt-4 flex items-center justify-center px-4 py-2 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 transition duration-200"
                >
                  <FiArrowLeft className="mr-2" /> Back to Lends
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
                      max={Number(remaining)}
                      required
                      onWheel={(e) => e.target.blur()}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Maximum: ₹{Number(remaining).toFixed(2)}
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <FiCreditCard className="inline mr-1" /> Destination
                  </label>
                  <select
                    name="source"
                    value={formData.source}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                    required
                  >
                    <option value="wallet">Wallet</option>
                    <option value="savings">Savings</option>
                  </select>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-70 transition duration-200 transform hover:scale-105"
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
                        <FiCheck className="mr-2" /> Receive Payment
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

export default ReceiveRepayment;
