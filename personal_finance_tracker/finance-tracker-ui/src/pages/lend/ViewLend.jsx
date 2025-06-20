import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Layout/DashboardLayout";
import api from "../../api/axios";
import { 
  FiEdit, FiTrash2, FiDollarSign, FiRefreshCw, 
  FiDownload, FiFilter, FiArrowLeft, FiCheck, FiX 
} from "react-icons/fi";

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  settled: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  default: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const ViewLend = () => {
  const [lends, setLends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    person: "",
    amount: "",
    date: "",
    description: "",
    status: "pending",
  });
  const [filters, setFilters] = useState({
    status: "all",
    fromDate: "",
    toDate: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  const navigate = useNavigate();

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d) ? "" : d.toISOString().slice(0, 10);
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

  const fetchLends = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filters.status !== "all") params.status = filters.status;
      if (filters.fromDate) params.from_date = filters.fromDate;
      if (filters.toDate) params.to_date = filters.toDate;

      const res = await api.get("/lends", { params });
      setLends(res.data);
    } catch (err) {
      console.error("Fetch lends failed:", err);
      setError("Failed to load lends. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLends();
  }, [filters]);

  const handleEditClick = (lend) => {
    setEditingId(lend.id);
    setEditFormData({
      person: lend.person || "",
      amount: lend.amount?.toString() || "",
      date: formatDateForInput(lend.date),
      description: lend.description || "",
      status: lend.status || "pending",
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveClick = async (id) => {
    const { person, amount, date, description, status } = editFormData;

    if (!person.trim() || !amount || !date) {
      setError("Please fill person, amount, and date fields.");
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      setError("Amount must be a number greater than 0.");
      return;
    }

    try {
      await api.put(`/lends/${id}`, {
        person,
        amount: amountValue,
        date,
        description,
        status,
      });
      setEditingId(null);
      fetchLends();
    } catch (err) {
      console.error("Save failed:", err);
      setError(err.response?.data?.detail || "Failed to save changes.");
    }
  };

  const handleCancelClick = () => {
    setEditingId(null);
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm("Are you sure you want to delete this lend record?")) return;

    try {
      await api.delete(`/lends/${id}`);
      fetchLends();
    } catch (err) {
      console.error("Delete failed:", err);
      setError("Failed to delete. Please try again.");
    }
  };

  const formatAmount = (amt) => {
    if (typeof amt !== "number") return amt;
    return amt.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });
  };

  const downloadCSV = () => {
    const headers = ["Person", "Amount", "Remaining", "Date", "Description", "Status"];
    const rows = lends.map((lend) => [
      lend.person,
      lend.amount,
      lend.remaining_amount || lend.amount,
      lend.date,
      lend.description || "",
      lend.status,
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers, ...rows].map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lends_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const applyFilters = () => {
    fetchLends();
    setShowFilters(false);
  };

  const resetFilters = () => {
    setFilters({
      status: "all",
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
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">View Lends</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {lends.length} lend records found
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-200"
                >
                  <FiFilter className="mr-2" /> Filters
                </button>
                <button
                  onClick={downloadCSV}
                  className="flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-200"
                >
                  <FiDownload className="mr-2" /> Export
                </button>
                <button
                  onClick={fetchLends}
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="settled">Settled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
                  <input
                    type="date"
                    value={filters.fromDate}
                    onChange={(e) => setFilters({...filters, fromDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
                  <input
                    type="date"
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
                  Apply
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300">
              <p>{error}</p>
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
            ) : lends.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No lend records found. Try adjusting your filters or add a new lend.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Person
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Remaining
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {lends.map((lend) => {
                    const isEditing = editingId === lend.id;
                    const statusClass = statusColors[lend.status?.toLowerCase()] || statusColors.default;

                    return (
                      <tr key={lend.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition duration-150">
                        {isEditing ? (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                name="person"
                                value={editFormData.person}
                                onChange={handleEditChange}
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="number"
                                name="amount"
                                value={editFormData.amount}
                                onChange={handleEditChange}
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                                min="0"
                                step="0.01"
                                onWheel={(e) => e.target.blur()}
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {formatAmount(lend.remaining_amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="date"
                                name="date"
                                value={editFormData.date}
                                onChange={handleEditChange}
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <textarea
                                name="description"
                                value={editFormData.description}
                                onChange={handleEditChange}
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                                rows="2"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <select
                                name="status"
                                value={editFormData.status}
                                onChange={handleEditChange}
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-md"
                              >
                                <option value="pending">Pending</option>
                                <option value="settled">Settled</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                              <button
                                onClick={() => handleSaveClick(lend.id)}
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
                              {lend.person}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {formatAmount(lend.amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {formatAmount(lend.remaining_amount)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {formatDateForDisplay(lend.date)}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300 max-w-xs truncate">
                              {lend.description || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClass}`}>
                                {lend.status?.charAt(0).toUpperCase() + lend.status?.slice(1) || "Pending"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                              <button
                                onClick={() => handleEditClick(lend)}
                                className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400 transition duration-150"
                              >
                                <FiEdit className="inline" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(lend.id)}
                                className="text-red-600 hover:text-red-900 dark:hover:text-red-400 transition duration-150"
                              >
                                <FiTrash2 className="inline" />
                              </button>
                              <button
                                onClick={() => navigate(`/repayment/receive/${lend.id}`)}
                                className="text-green-600 hover:text-green-900 dark:hover:text-green-400 transition duration-150"
                              >
                                <FiDollarSign className="inline" />
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

export default ViewLend;