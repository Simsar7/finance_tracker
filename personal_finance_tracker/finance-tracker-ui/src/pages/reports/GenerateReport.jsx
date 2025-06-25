import { useState, useEffect } from "react";
import DashboardLayout from "../../components/Layout/DashboardLayout";
import { 
  FiDownload, FiFilter, FiChevronDown, 
  FiChevronUp, FiX, FiCheck, FiRefreshCw 
} from "react-icons/fi";
import axios from "axios"; // Make sure to install axios if not already

const categoryOptions = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "savings", label: "Savings" },
  { value: "borrow", label: "Borrow" },
  { value: "lend", label: "Lend" }
];

const API_BASE_URL = process.env.REACT_APP_API;


const GenerateReports = () => {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("summary");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCategories, setSelectedCategories] = useState(categoryOptions.map(cat => cat.value));
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [transactions, setTransactions] = useState([]);

  // Fetch transactions from backend API
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setFetching(true);
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_BASE_URL}/transactions`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setTransactions(response.data);
      } catch (err) {
        console.error("Error fetching transactions:", err);
        setError("Failed to load transactions. Please try again.");
      } finally {
        setFetching(false);
      }
    };

    fetchTransactions();
  }, []);

  // Filter transactions based on selected criteria
  const filterTransactions = () => {
    if (!transactions || transactions.length === 0) return [];
    
    return transactions.filter(transaction => {
      // Category filter
      if (selectedCategories.length > 0 && !selectedCategories.includes(transaction.category)) {
        return false;
      }
      
      // Date range filter
      const transactionDate = new Date(transaction.date);
      if (startDate && new Date(startDate) > transactionDate) {
        return false;
      }
      if (endDate && new Date(endDate) < transactionDate) {
        return false;
      }
      
      return true;
    });
  };

  const validateForm = () => {
    if (!title.trim()) {
      setError("Please enter a report title");
      return false;
    }
    
    if (selectedCategories.length === 0) {
      setError("Please select at least one category");
      return false;
    }
    
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setError("End date cannot be before start date");
      return false;
    }
    
    if (transactions.length === 0) {
      setError("No transaction data available");
      return false;
    }
    
    return true;
  };

  const handleCategoryChange = (e) => {
    const { value, checked } = e.target;
    
    if (value === "all") {
      setSelectedCategories(checked ? categoryOptions.map(cat => cat.value) : []);
    } else {
      setSelectedCategories(prev =>
        checked ? [...prev, value] : prev.filter(cat => cat !== value)
      );
    }
  };

  const generateReport = async () => {
    setError(null);
    setSuccess(null);
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const filteredTransactions = filterTransactions();
      
      if (filteredTransactions.length === 0) {
        setError("No transactions match your filters. Try adjusting your criteria.");
        return;
      }

      const reportData = {
        title: title.trim(),
        type,
        filters: {
          categories: selectedCategories,
          startDate,
          endDate,
        },
        data: filteredTransactions,
        summary: {
          totalTransactions: filteredTransactions.length,
          totalAmount: filteredTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0),
          byCategory: categoryOptions.reduce((acc, cat) => {
            if (selectedCategories.includes(cat.value)) {
              acc[cat.label] = filteredTransactions
                .filter(t => t.category === cat.value)
                .reduce((sum, t) => sum + parseFloat(t.amount), 0);
            }
            return acc;
          }, {})
        }
      };

      // Save report to backend
      const token = localStorage.getItem("token");
      await axios.post(`${API_BASE_URL}/reports`, reportData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setSuccess(`Report generated with ${filteredTransactions.length} transactions!`);
      
      // Reset form but keep filters
      setTitle("");
    } catch (err) {
      setError("Failed to generate report. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    const filteredTransactions = filterTransactions();
    
    if (filteredTransactions.length === 0) {
      setError("No transactions to export. Please adjust your filters.");
      return;
    }

    // Prepare CSV content
    const headers = ["Date", "Category", "Description", "Amount", "Type", "Account"];
    
    const rows = filteredTransactions.map(t => [
      t.date,
      t.category,
      t.description || "",
      t.amount,
      t.type || "",
      t.account || ""
    ]);

    // Create summary section
    const summary = [
      ["REPORT SUMMARY"],
      [`Title: ${title || "Untitled Report"}`],
      [`Date Range: ${startDate || 'Any'} to ${endDate || 'Any'}`],
      [`Categories: ${selectedCategories.map(c => 
        categoryOptions.find(cat => cat.value === c)?.label || c
      ).join(", ")}`],
      [`Total Transactions: ${filteredTransactions.length}`],
      [`Total Amount: ${filteredTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)}`],
      ["", "", "", "", "", ""],
      ["TRANSACTION DETAILS"],
      headers
    ];

    // Combine all data
    const csvContent = [
      ...summary.map(row => row.join(",")),
      ...rows.map(row => row.join(","))
    ].join("\n");

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `financial_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetForm = () => {
    setTitle("");
    setType("summary");
    setStartDate("");
    setEndDate("");
    setSelectedCategories(categoryOptions.map(cat => cat.value));
    setError(null);
    setSuccess(null);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Generate Report</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Create custom reports from your financial data
            </p>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 rounded">
                <p>{error}</p>
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 text-green-700 dark:text-green-300 rounded">
                <p>{success}</p>
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Report Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Monthly Financial Summary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Report Type
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="summary">Summary</option>
                  <option value="detailed">Detailed</option>
                </select>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Date Range
                  </h3>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:hover:text-blue-400"
                  >
                    {showFilters ? (
                      <span className="flex items-center">
                        Hide <FiChevronUp className="ml-1" />
                      </span>
                    ) : (
                      <span className="flex items-center">
                        Show <FiChevronDown className="ml-1" />
                      </span>
                    )}
                  </button>
                </div>

                {showFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        From Date
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        max={endDate || new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        To Date
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Categories to Include <span className="text-red-500">*</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      value="all"
                      checked={selectedCategories.length === categoryOptions.length}
                      onChange={handleCategoryChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">All Categories</span>
                  </label>
                  {categoryOptions.map((category) => (
                    <label key={category.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        value={category.value}
                        checked={selectedCategories.includes(category.value)}
                        onChange={handleCategoryChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{category.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-4">
                <button
                  type="button"
                  onClick={generateReport}
                  disabled={loading || fetching}
                  className="flex-1 flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition duration-200"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <FiRefreshCw className="mr-2" />
                      Generate Report
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={downloadReport}
                  disabled={loading || fetching || !title}
                  className="flex-1 flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition duration-200"
                >
                  <FiDownload className="mr-2" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-200"
                >
                  <FiX className="mr-2" />
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GenerateReports;
