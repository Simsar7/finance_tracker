import api from "./axios";

export const getBorrows = () => api.get("/borrows/");
export const createBorrow = (data) => api.post("/borrows/", data);
export const getSingleBorrow = (id) => api.get(`/borrows/${id}`);
export const updateBorrow = (id, data) => api.put(`/borrows/${id}`, data);
export const deleteBorrow = (id) => api.delete(`/borrows/${id}`);
