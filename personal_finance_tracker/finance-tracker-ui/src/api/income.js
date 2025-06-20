import api from "./axios";

export const getIncome = () => api.get("/incomes/");
export const createIncome = (data) => api.post("/incomes/", data);
export const getSingleIncome = (id) => api.get(`/incomes/${id}`);
export const updateIncome = (id, data) => api.put(`/incomes/${id}`, data);
