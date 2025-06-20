import api from "./axios";

export const getLends = () => api.get("/lend/");
export const createLend = (data) => api.post("/lend/", data);
export const getSingleLend = (id) => api.get(`/lend/${id}`);
export const updateLend = (id, data) => api.put(`/lend/${id}`, data);
