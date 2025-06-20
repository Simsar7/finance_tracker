import api from "./axios";
import qs from "qs";

// Login expects { username, password }
export const loginUser = async (username, password) => {
  try {
    const response = await api.post(
      "/auth/login",
      qs.stringify({ username, password }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    console.log("Login response data:", response.data);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Signup expects { username, email, password }
export const signupUser = async (userData) => {
  const response = await fetch("http://localhost:8000/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json", // ✅ must be application/json
    },
    body: JSON.stringify({
      username: userData.username,
      password: userData.password,
      email: userData.email, // ✅ This is required
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Signup failed");
  }

  return await response.json();
};
