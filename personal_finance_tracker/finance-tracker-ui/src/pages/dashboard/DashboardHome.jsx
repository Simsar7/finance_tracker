import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "../../components/Layout/DashboardLayout";
import {
  FiDollarSign,
  FiPieChart,
  FiTrendingUp,
  FiTrendingDown,
  FiRefreshCw,
  FiCalendar,
  FiFilter,
  FiX
} from "react-icons/fi";
import { motion } from "framer-motion";
import api from "../../services/api"; // Assuming you have an api service configured

const DashboardHome = () => {
  const location = useLocation();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date()
  });
  const [tempDateRange, setTempDateRange] = useState({ ...dateRange });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        start_date: dateRange.start.toISOString().split('T')[0],
        end_date: dateRange.end.toISOString().split('T')[0]
      };

      const [dashboardResponse, savingsResponse] = await Promise.all([
        api.get(`/dashboard/`, { params }),
        api.get("/savings/")
      ]);

      const totalSavings = savingsResponse.data.reduce((acc, item) => {
        const amount = Number(item.amount);
        if (item.type === "manual" || item.type === "auto") {
          return acc + amount;
        } else if (item.type === "spend") {
          return acc - amount;
        }
        return acc;
      }, 0);

      setDashboardData({
        ...dashboardResponse.data,
        savings_balance: totalSavings,
      });
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
      setError(
        err.response?.data?.message ||
          "Failed to load dashboard data. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [location.state?.refresh, dateRange]);

  const formatCurrency = (amount) => {
    if (isNaN(amount)) return "0";
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateRange = () => {
    return `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}`;
  };

  const handleStartDateChange = (e) => {
    setTempDateRange({
      ...tempDateRange,
      start: new Date(e.target.value)
    });
  };

  const handleEndDateChange = (e) => {
    setTempDateRange({
      ...tempDateRange,
      end: new Date(e.target.value)
    });
  };

  const applyFilters = () => {
    setDateRange(tempDateRange);
    setShowFilters(false);
  };

  const resetFilters = () => {
    const end = new Date();
    const start = new Date(new Date().setDate(end.getDate() - 30));
    setTempDateRange({ start, end });
    setDateRange({ start, end });
    setShowFilters(false);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
              Dashboard Overview
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Summary of your financial status
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 text-sm w-full md:w-auto"
              >
                <FiFilter className="text-gray-500" />
                <span>{formatDateRange()}</span>
              </button>
              
              {showFilters && (
                <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-700 dark:text-gray-300">
                      Filter by date range
                    </h3>
                    <button 
                      onClick={() => setShowFilters(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <FiX size={18} />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        From
                      </label>
                      <input
                        type="date"
                        value={tempDateRange.start.toISOString().split('T')[0]}
                        onChange={handleStartDateChange}
                        max={tempDateRange.end.toISOString().split('T')[0]}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        To
                      </label>
                      <input
                        type="date"
                        value={tempDateRange.end.toISOString().split('T')[0]}
                        onChange={handleEndDateChange}
                        min={tempDateRange.start.toISOString().split('T')[0]}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex justify-between gap-3 pt-2">
                      <button
                        onClick={resetFilters}
                        className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Reset
                      </button>
                      <button
                        onClick={applyFilters}
                        className="flex-1 px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FiRefreshCw className={`text-gray-500 ${loading ? "animate-spin" : ""}`} />
            </button>
            
            <div className="hidden md:flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
              <FiCalendar />
              <span>{formatDate(new Date())}</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4"
          >
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </motion.div>
        )}

        {/* Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 h-36 animate-pulse border border-gray-100 dark:border-gray-700"
              >
                <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="h-8 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 w-3/4 bg-gray-100 dark:bg-gray-600 rounded"></div>
              </motion.div>
            ))}
          </div>
        ) : dashboardData ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Wallet Balance Card */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border-l-4 border-blue-500 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 mr-3">
                    <FiDollarSign className="text-blue-500 dark:text-blue-400 text-xl" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    Wallet Balance
                  </h3>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
                ₹ {formatCurrency(dashboardData.wallet_balance)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Available funds</p>
            </motion.div>

            {/* Total Savings Card */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border-l-4 border-green-500 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/30 mr-3">
                    <FiPieChart className="text-green-500 dark:text-green-400 text-xl" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    Total Savings
                  </h3>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
                ₹ {formatCurrency(dashboardData.savings_balance)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Across all accounts</p>
            </motion.div>

            {/* Income Card */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.3, delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border-l-4 border-purple-500 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30 mr-3">
                    <FiTrendingUp className="text-purple-500 dark:text-purple-400 text-xl" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    Income
                  </h3>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
                ₹ {formatCurrency(dashboardData.monthly_income || 0)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatDateRange()}
              </p>
            </motion.div>

            {/* Expenses Card */}
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              transition={{ duration: 0.3, delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border-l-4 border-red-500 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/30 mr-3">
                    <FiTrendingDown className="text-red-500 dark:text-red-400 text-xl" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    Expenses
                  </h3>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
                ₹ {formatCurrency(dashboardData.monthly_expenses || 0)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatDateRange()}
              </p>
            </motion.div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center border border-gray-100 dark:border-gray-700"
          >
            <p className="text-gray-500 dark:text-gray-400">
              No dashboard data available
            </p>
            <button
              onClick={fetchDashboardData}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </motion.div>
        )}

        {/* Additional Sections */}
        {dashboardData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  Financial Overview
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDateRange()}
                </span>
              </div>
              <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <p className="text-gray-400 dark:text-gray-500">
                  Chart visualization placeholder
                </p>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  Recent Activity
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDateRange()}
                </span>
              </div>
              <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                <p className="text-gray-400 dark:text-gray-500">
                  Recent transactions placeholder
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardHome;
