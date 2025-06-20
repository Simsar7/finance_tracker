import { useState } from "react";
import DashboardLayout from "../../components/Layout/DashboardLayout";
import api from "../../api/axios";

const AddBorrow = () => {
  const [formData, setFormData] = useState({
    person: "",
    amount: "",
    date: new Date().toISOString().split('T')[0],
    description: "",
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const amountNum = parseFloat(formData.amount);
    
    if (!formData.person.trim()) {
      newErrors.person = "Lender's name is required";
    }
    if (isNaN(amountNum)) {
      newErrors.amount = "Please enter a valid number";
    } else if (amountNum <= 0) {
      newErrors.amount = "Amount must be greater than zero";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);

      const payload = {
        person: formData.person.trim(),
        amount: parseFloat(formData.amount),
        date: formData.date,
        description: formData.description.trim() || undefined,
        destination: "wallet",
        type: "borrow",
        status: "pending",
      };

      await api.post("/borrows/", payload);
      
      // Set success message and clear form
      setSuccessMessage("Borrow added successfully! Amount has been added to your wallet.");
      setFormData({
        person: "",
        amount: "",
        date: new Date().toISOString().split('T')[0],
        description: "",
      });

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage("");
      }, 5000);
    } catch (error) {
      console.error("Error saving borrow:", error.response?.data || error.message);
      setSuccessMessage("Failed to save borrow. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-3xl font-bold text-white">Add New Borrow</h2>
          <p className="text-blue-100 mt-2">Record money you've borrowed from someone</p>
        </div>
        
        {/* Success/Error Message */}
        {successMessage && (
          <div className={`mb-6 p-4 rounded-lg ${successMessage.includes("Failed") ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md overflow-hidden p-6 md:p-8">
          <div className="space-y-6">
            <div>
              <label htmlFor="person" className="block text-sm font-medium text-gray-700 mb-1">
                Lender Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="person"
                name="person"
                value={formData.person}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-lg border ${errors.person ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition`}
                placeholder="Who lent you the money?"
              />
              {errors.person && <p className="mt-1 text-sm text-red-600">{errors.person}</p>}
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 rounded-lg border ${errors.amount ? 'border-red-500' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition appearance-none`}
                  placeholder="How much did you borrow?"
                  min="0"
                  step="0.01"
                  // This hides the number input arrows
                  onWheel={(e) => e.target.blur()}
                  style={{ WebkitAppearance: "textfield", MozAppearance: "textfield" }}
                />
                <span className="absolute right-3 top-3 text-gray-400">₹</span>
              </div>
              {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                rows="3"
                placeholder="Additional details about the borrow (optional)"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className={`w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium py-3 px-6 rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  "Save Borrow"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default AddBorrow;