import { useEffect, useState } from "react";
import DashboardLayout from "../../components/Layout/DashboardLayout";
import api from "../../api/axios";
import { 
  FiEdit, FiTrash2, FiDownload, 
  FiRefreshCw, FiFilter, FiChevronDown, 
  FiChevronUp, FiCheck, FiX 
} from "react-icons/fi";

const incomeSources = [
  { value: "salary", label: "Salary" },
  { value: "freelance", label: "Freelance" },
  { value: "business", label: "Business" },
  { value: "investment", label: "Investment" },
  { value: "gift", label: "Gift" },
  { value: "other", label: "Other" },
];

const ViewIncome = () => {
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    source: "",
    amount: "",
    date: "",
    notes: "",
  });
  const [filters, setFilters] = useState({
    source: "all",
    fromDate: "",
    toDate: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d)) return "";
    return d.toISOString().slice(0, 10);
  };

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

  const fetchIncomes = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (filters.source !== "all") params.source = filters.source;
      if (filters.fromDate) params.from_date = filters.fromDate;
      if (filters.toDate) params.to_date = filters.toDate;

      const response = await api.get("/incomes/", { params });
      setIncomes(response.data);
    } catch (err) {
      setError("Failed to load income records. Please try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncomes();
  }, [filters]);

  const handleEditClick = (income) => {
    setEditingId(income.id);
    setEditFormData({
      source: income.source || "",
      amount: income.amount || "",
      date: formatDateForInput(income.date),
      notes: income.notes || "",
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveClick = async (id) => {
    if (!editFormData.source || !editFormData.amount || !editFormData.date) {
      setError("Please fill all required fields (source, amount, date).");
      return;
    }

    const originalIncome = incomes.find((inc) => inc.id === id);

    const payload = {
      source: editFormData.source,
      amount: parseFloat(editFormData.amount),
      date: editFormData.date,
      notes: editFormData.notes,
      destination: originalIncome?.destination || "wallet",
    };

    try {
      await api.put(`/incomes/${id}/`, payload);
      setEditingId(null);
      setSuccess("Income updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
      fetchIncomes();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update income record.");
      console.error(err);
    }
  };

  const handleCancelClick = () => {
    setEditingId(null);
    setError(null);
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm("Are you sure you want to delete this income record?")) return;

    try {
      await api.delete(`/incomes/${id}/`);
      setSuccess("Income deleted successfully!");
      setTimeout(() => setSuccess(null), 3000);
      fetchIncomes();
    } catch (err) {
      setError("Failed to delete income record.");
      console.error(err);
    }
  };

  const downloadCSV = () => {
    const headers = ["Source", "Amount (₹)", "Date", "Notes"];
    const rows = incomes.map(({ source, amount, date, notes }) => [
      incomeSources.find(s => s.value === source)?.label || source,
      amount,
      date,
      notes || "",
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers, ...rows].map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `income_records_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const applyFilters = () => {
    fetchIncomes();
    setShowFilters(false);
  };

  const resetFilters = () => {
    setFilters({
      source: "all",
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
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Income Records</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {incomes.length} income records found
                </p>
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
                  onClick={fetchIncomes}
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source</label>
                  <select
                    name="source"
                    value={filters.source}
                    onChange={(e) => setFilters({...filters, source: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                  >
                    <option value="all">All Sources</option>
                    {incomeSources.map((source) => (
                      <option key={source.value} value={source.value}>
                        {source.label}
                      </option>
                    ))}
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
            ) : incomes.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No income records found. Try adjusting your filters or add a new income.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Source
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Notes
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {incomes.map((income) => {
                    const isEditing = editingId === income.id;
                    const sourceLabel = incomeSources.find(s => s.value === income.source)?.label || income.source;

                    return (
                      <tr key={income.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150">
                        {isEditing ? (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                name="source"
                                value={editFormData.source}
                                onChange={handleEditChange}
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                                required
                              >
                                <option value="">Select source</option>
                                {incomeSources.map((source) => (
                                  <option key={source.value} value={source.value}>
                                    {source.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <span className="text-gray-500">₹</span>
                                </div>
                                <input
                                  type="number"
                                  name="amount"
                                  value={editFormData.amount}
                                  onChange={handleEditChange}
                                  className="w-full pl-10 pr-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                                  min="0"
                                  step="0.01"
                                  required
                                  onWheel={(e) => e.target.blur()}
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="date"
                                name="date"
                                value={editFormData.date}
                                onChange={handleEditChange}
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                                required
                              />
                            </td>
                            <td className="px-6 py-4">
                              <textarea
                                name="notes"
                                value={editFormData.notes}
                                onChange={handleEditChange}
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                                rows="2"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                              <button
                                onClick={() => handleSaveClick(income.id)}
                                className="text-green-600 hover:text-green-900 dark:hover:text-green-400 transition duration-150"
                              >
                                <FiCheck className="inline" />
                              </button>
                              <button
                                onClick={handleCancelClick}
                                className="text-red-600 hover:text-red-900 dark:hover:text-red-400 transition duration-150"
                              >
                                <FiX className="inline" />
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {sourceLabel}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {formatAmount(income.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {formatDateForDisplay(income.date)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 max-w-xs truncate">
                              {income.notes || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                              <button
                                onClick={() => handleEditClick(income)}
                                className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 transition duration-150"
                              >
                                <FiEdit className="inline" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(income.id)}
                                className="text-red-600 hover:text-red-900 dark:hover:text-red-400 transition duration-150"
                              >
                                <FiTrash2 className="inline" />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ViewIncome;