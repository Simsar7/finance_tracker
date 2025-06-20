import { useEffect, useState } from "react";
import DashboardLayout from "../../components/Layout/DashboardLayout";
import api from "../../api/axios";
import { 
  FiTrash2, FiDownload, FiRefreshCw, 
  FiFilter, FiChevronDown, FiChevronUp,
  FiPlusCircle, FiMinusCircle
} from "react-icons/fi";

const ViewSavings = () => {
  const [savings, setSavings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filters, setFilters] = useState({
    type: "all",
    fromDate: "",
    toDate: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [balance, setBalance] = useState(0);

  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const fetchSavings = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filters.type !== "all") params.type = filters.type;
      if (filters.fromDate) params.from_date = filters.fromDate;
      if (filters.toDate) params.to_date = filters.toDate;

      const response = await api.get("/savings/", { params });
      setSavings(response.data);

      // Calculate current balance
      const currentBalance = response.data.reduce((acc, item) => {
        if (item.type === "manual" || item.type === "auto") {
          return acc + Number(item.amount);
        } else if (item.type === "spend") {
          return acc - Number(item.amount);
        }
        return acc;
      }, 0);
      setBalance(currentBalance);
    } catch (err) {
      setError("Failed to load savings records. Please try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavings();
  }, [filters]);

  const handleDeleteClick = async (id) => {
    if (!window.confirm("Are you sure you want to delete this savings record?")) return;

    try {
      await api.delete(`/savings/${id}/`);
      setSuccess("Savings record deleted successfully!");
      setTimeout(() => setSuccess(null), 3000);
      fetchSavings();
    } catch (err) {
      setError("Failed to delete savings record.");
      console.error(err);
    }
  };

  const downloadCSV = () => {
    const headers = ["Type", "Amount", "Date", "Reason"];
    const rows = savings.map((saving) => [
      saving.type === "spend" ? "Spent" : "Added",
      saving.amount,
      saving.date,
      saving.reason || "",
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers, ...rows].map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `savings_records_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const applyFilters = () => {
    fetchSavings();
    setShowFilters(false);
  };

  const resetFilters = () => {
    setFilters({
      type: "all",
      fromDate: "",
      toDate: "",
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Savings History</h2>
                <div className="flex items-center mt-1">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mr-4">
                    Current Balance: <span className="font-semibold">{formatAmount(balance)}</span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {savings.length} records found
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-200"
                >
                  <FiFilter className="mr-2" /> 
                  Filters
                  {showFilters ? (
                    <FiChevronUp className="ml-2" />
                  ) : (
                    <FiChevronDown className="ml-2" />
                  )}
                </button>
                <button
                  onClick={downloadCSV}
                  className="flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-200"
                >
                  <FiDownload className="mr-2" /> Export
                </button>
                <button
                  onClick={fetchSavings}
                  className="flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition duration-200"
                >
                  <FiRefreshCw className="mr-2" /> Refresh
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select
                    name="type"
                    value={filters.type}
                    onChange={(e) => setFilters({...filters, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                  >
                    <option value="all">All Types</option>
                    <option value="manual,auto">Added to Savings</option>
                    <option value="spend">Spent from Savings</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
                  <input
                    type="date"
                    name="fromDate"
                    value={filters.fromDate}
                    onChange={(e) => setFilters({...filters, fromDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
                  <input
                    type="date"
                    name="toDate"
                    value={filters.toDate}
                    onChange={(e) => setFilters({...filters, toDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={resetFilters}
                  className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition duration-200"
                >
                  Reset
                </button>
                <button
                  onClick={applyFilters}
                  className="px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition duration-200"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300">
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 text-green-700 dark:text-green-300">
              <p>{success}</p>
            </div>
          )}

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center p-8">
                <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : savings.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No savings records found. Try adjusting your filters or add a new record.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Reason
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {savings.map((saving) => (
                    <tr key={saving.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {saving.type === "spend" ? (
                            <FiMinusCircle className="text-red-500 mr-2" />
                          ) : (
                            <FiPlusCircle className="text-green-500 mr-2" />
                          )}
                          <span className="text-sm font-medium">
                            {saving.type === "spend" ? "Spent" : "Added"}
                          </span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        saving.type === "spend" 
                          ? "text-red-600 dark:text-red-400" 
                          : "text-green-600 dark:text-green-400"
                      }`}>
                        {saving.type === "spend" ? "-" : "+"}{formatAmount(saving.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {formatDateForDisplay(saving.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 max-w-xs truncate">
                        {saving.reason || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteClick(saving.id)}
                          className="text-red-600 hover:text-red-900 dark:hover:text-red-400 transition duration-150"
                        >
                          <FiTrash2 className="inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ViewSavings;