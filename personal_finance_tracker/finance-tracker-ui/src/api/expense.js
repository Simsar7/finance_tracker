import api from "./axios";

export const getExpenses = () => api.get("/expenses/");
export const createExpense = (data) => api.post("/expenses/", data);
export const getSingleExpense = (id) => api.get(`/expenses/${id}`);
export const updateExpense = (id, data) => api.put(`/expenses/${id}`, data);
