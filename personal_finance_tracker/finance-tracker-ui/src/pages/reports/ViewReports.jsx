import { useEffect, useState } from "react";
import DashboardLayout from "../../components/Layout/DashboardLayout";
import { FiDownload, FiTrash2, FiEye, FiRefreshCw, FiX, FiFilter, FiChevronDown, FiChevronUp } from "react-icons/fi";

const ViewReports = () => {
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [compareIds, setCompareIds] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      setError(null);
      try {
        const storedReports = JSON.parse(localStorage.getItem("reports") || "[]");
        const normalizedReports = storedReports
          .map(report => ({
            ...report,
            data: Array.isArray(report.data) ? report.data : [],
            date: report.date || report.createdAt || new Date().toISOString(),
            type: report.type || "summary",
            filters: report.filters || {}
          }))
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        setReports(normalizedReports);
      } catch (err) {
        console.error("Error loading reports:", err);
        setError("Failed to load reports. Please try again.");
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || report.type === typeFilter;
    
    const now = new Date();
    const reportDate = new Date(report.date);
    let matchesDate = true;
    
    if (dateFilter === "today") {
      matchesDate = reportDate.toDateString() === now.toDateString();
    } else if (dateFilter === "week") {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = reportDate >= oneWeekAgo;
    } else if (dateFilter === "month") {
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      matchesDate = reportDate >= oneMonthAgo;
    }
    
    return matchesSearch && matchesType && matchesDate;
  });

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this report?")) {
      const updatedReports = reports.filter((report) => report.id !== id);
      setReports(updatedReports);
      localStorage.setItem("reports", JSON.stringify(updatedReports));
      if (selectedReport?.id === id) setSelectedReport(null);
      setCompareIds((prev) => prev.filter((cid) => cid !== id));
      showNotification("Report deleted successfully");
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      const storedReports = JSON.parse(localStorage.getItem("reports") || "[]");
      setReports(storedReports);
      setLoading(false);
      showNotification("Reports refreshed");
    }, 800);
  };

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDownload = (report) => {
    const reportData = Array.isArray(report.data) ? report.data : [];
    if (reportData.length === 0) {
      showNotification("No data available to download");
      return;
    }

    try {
      const headers = [...new Set(
        reportData.flatMap(item => Object.keys(item))
      )];

      const csvRows = [
        headers.join(","),
        ...reportData.map(row =>
          headers.map(field => {
            const value = row[field];
            if (value === null || value === undefined) return "";
            if (typeof value === "object") {
              return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            }
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(",")
        )
      ];

      const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.title.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showNotification("Download started");
    } catch (err) {
      console.error("Download error:", err);
      showNotification("Failed to generate CSV file");
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  const formatFilters = (filters) => {
    if (!filters || Object.keys(filters).length === 0) return "None";
    const { startDate, endDate, categories } = filters;

    let parts = [];
    if (startDate && endDate) {
      parts.push(`${formatDate(startDate)} to ${formatDate(endDate)}`);
    } else if (startDate) {
      parts.push(`From ${formatDate(startDate)}`);
    } else if (endDate) {
      parts.push(`Until ${formatDate(endDate)}`);
    }

    if (categories && Array.isArray(categories)) {
      parts.push(`Categories: ${categories.join(", ")}`);
    }

    return parts.length > 0 ? parts.join(" | ") : "None";
  };

  const toggleCompare = (id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((cid) => cid !== id);
      } else if (prev.length < 2) {
        return [...prev, id];
      } else {
        showNotification("You can compare only two reports at a time");
        return prev;
      }
    });
  };

  const compareReports = reports.filter(r => compareIds.includes(r.id));

  const reportTypes = [...new Set(reports.map(report => report.type))];

  return (
    <DashboardLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 sm:mb-0">Reports</h2>
          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              className="flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
            >
              <FiRefreshCw className="mr-2" />
              Refresh
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
            >
              <FiFilter className="mr-2" />
              Filters
              {showFilters ? <FiChevronUp className="ml-1" /> : <FiChevronDown className="ml-1" />}
            </button>
          </div>
        </div>

        {notification && (
          <div className="fixed top-4 right-4 z-50">
            <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center animate-fade-in-down">
              <span>{notification}</span>
              <button 
                onClick={() => setNotification(null)} 
                className="ml-2"
              >
                <FiX />
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {showFilters && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow-md border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search reports..."
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  {reportTypes.map(type => (
                    <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center p-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-700 mb-1">
                {searchTerm || typeFilter !== "all" || dateFilter !== "all" 
                  ? "No matching reports found" 
                  : "No reports available"}
              </h3>
              <p className="text-gray-500">
                {searchTerm || typeFilter !== "all" || dateFilter !== "all" 
                  ? "Try adjusting your filters" 
                  : "Generate a report to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Compare
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Records
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReports.map((report) => {
                    const reportData = Array.isArray(report.data) ? report.data : [];
                    return (
                      <tr 
                        key={report.id} 
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            checked={compareIds.includes(report.id)}
                            onChange={() => toggleCompare(report.id)}
                            disabled={!compareIds.includes(report.id) && compareIds.length >= 2}
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{report.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{formatDate(report.date)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                            {report.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {reportData.length}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => setSelectedReport(report)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded-md hover:bg-blue-50"
                              title="View"
                            >
                              <FiEye className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDownload(report)}
                              className="text-green-600 hover:text-green-900 p-1 rounded-md hover:bg-green-50"
                              title="Download"
                            >
                              <FiDownload className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(report.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded-md hover:bg-red-50"
                              title="Delete"
                            >
                              <FiTrash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Single Report Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center border-b border-gray-200 p-4">
                <h3 className="text-xl font-bold text-gray-800">{selectedReport.title}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleDownload(selectedReport)}
                    className="flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors duration-200"
                  >
                    <FiDownload className="mr-2" />
                    Download
                  </button>
                  <button
                    className="text-gray-500 hover:text-gray-700 p-1"
                    onClick={() => setSelectedReport(null)}
                  >
                    <FiX className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto flex-grow">
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-600">Report Date</p>
                    <p className="text-gray-800">{formatDate(selectedReport.date)}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-600">Report Type</p>
                    <p className="text-gray-800 capitalize">{selectedReport.type}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-600">Records</p>
                    <p className="text-gray-800">{(Array.isArray(selectedReport.data) ? selectedReport.data : []).length}</p>
                  </div>
                  <div className="md:col-span-3">
                    <p className="font-semibold text-gray-600">Filters</p>
                    <p className="text-gray-800">{formatFilters(selectedReport.filters)}</p>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-auto max-h-[50vh]">
                    {Array.isArray(selectedReport.data) && selectedReport.data.length > 0 ? (
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            {Object.keys(selectedReport.data[0]).map((key) => (
                              <th 
                                key={key} 
                                className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedReport.data.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              {Object.keys(row).map((key) => (
                                <td key={key} className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {typeof row[key] === "object" ? JSON.stringify(row[key]) : row[key]}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center p-8 text-gray-500">
                        No data available in this report
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comparison Modal */}
        {compareReports.length === 2 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center border-b border-gray-200 p-4">
                <h3 className="text-xl font-bold text-gray-800">Compare Reports</h3>
                <button
                  className="text-gray-500 hover:text-gray-700 p-1"
                  onClick={() => setCompareIds([])}
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-grow">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {compareReports.map((report) => {
                    const reportData = Array.isArray(report.data) ? report.data : [];
                    return (
                      <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="mb-4">
                          <h4 className="font-semibold text-lg text-gray-800 mb-1">{report.title}</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-gray-600">Date:</p>
                              <p className="text-gray-800">{formatDate(report.date)}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Type:</p>
                              <p className="text-gray-800 capitalize">{report.type}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Records:</p>
                              <p className="text-gray-800">{reportData.length}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Filters:</p>
                              <p className="text-gray-800">{formatFilters(report.filters)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          {reportData.length > 0 ? (
                            <>
                              <div className="overflow-auto max-h-[40vh]">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      {Object.keys(reportData[0]).map((key) => (
                                        <th 
                                          key={key} 
                                          className="px-3 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                        >
                                          {key}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {reportData.slice(0, 10).map((row, idx) => (
                                      <tr key={idx} className="hover:bg-gray-50">
                                        {Object.keys(row).map((key) => (
                                          <td 
                                            key={key} 
                                            className="px-3 py-1 whitespace-nowrap text-xs text-gray-500"
                                          >
                                            {typeof row[key] === "object" ? JSON.stringify(row[key]) : row[key]}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              {reportData.length > 10 && (
                                <div className="bg-gray-50 px-3 py-1 text-xs text-gray-500">
                                  Showing first 10 of {reportData.length} rows
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-center p-4 text-gray-500">
                              No data available in this report
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ViewReports;