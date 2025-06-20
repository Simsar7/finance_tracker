import api from "./axios";

export const getSavings = () => api.get("/savings/");
export const addToSavings = (data) => api.post("/savings/", data);
export const spendFromSavings = (data) => api.post("/savings/spend", data);
