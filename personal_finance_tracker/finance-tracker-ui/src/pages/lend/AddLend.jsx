import { useState } from "react";
import DashboardLayout from "../../components/Layout/DashboardLayout";
import api from "../../api/axios";

const AddLend = () => {
  const [formData, setFormData] = useState({
    person: "",
    amount: "",
    date: "",
    description: "",
    source: "wallet", // wallet or savings
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!formData.person || !formData.amount || !formData.date) {
      setError("Please fill in person, amount, and date.");
      return;
    }

    const amountValue = parseFloat(formData.amount);

    if (amountValue <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    if (!["wallet", "savings"].includes(formData.source)) {
      setError("Source must be either 'wallet' or 'savings'.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...formData,
        amount: amountValue,
        remaining_amount: amountValue, // <-- added this line
        type: "lend",
        status: "pending",
      };

      await api.post("/lends", payload);

      setSuccess(true);
      setFormData({
        person: "",
        amount: "",
        date: "",
        description: "",
        source: "wallet",
      });

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const detail = err.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(detail); // list of validation errors
      } else {
        setError(detail || "Failed to add lend. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-4">Add Lend</h2>

      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm space-y-1">
          {Array.isArray(error) ? (
            error.map((e, i) => (
              <p key={i}>
                {e?.loc?.join(".")}: {e?.msg}
              </p>
            ))
          ) : (
            <p>{error}</p>
          )}
        </div>
      )}

      {success && (
        <div className="mb-4 p-2 bg-green-100 text-green-700 rounded text-sm">
          Lend added successfully!
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-6 rounded shadow-md w-full max-w-xl space-y-4"
      >
        <div>
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">Person</label>
          <input
            type="text"
            name="person"
            value={formData.person}
            onChange={handleChange}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
            placeholder="Enter person's name"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">Amount</label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
            placeholder="Enter amount"
            min="0.01"
            step="0.01"
            required
            onWheel={(e) => e.target.blur()}
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">Date</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
            required
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">Source</label>
          <select
            name="source"
            value={formData.source}
            onChange={handleChange}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
            required
          >
            <option value="wallet">Wallet</option>
            <option value="savings">Savings</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 font-medium text-gray-700 dark:text-gray-200">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white"
            rows="3"
            placeholder="Additional description (optional)"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 w-full"
        >
          {loading ? "Saving..." : "Save Lend"}
        </button>
      </form>
    </DashboardLayout>
  );
};

export default AddLend;
