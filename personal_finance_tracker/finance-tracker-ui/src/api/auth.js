import api from "./axios";
import qs from "qs";

// ✅ Login function using application/x-www-form-urlencoded (required for OAuth2PasswordRequestForm)
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
    console.error("Login error:", error);
    throw error;
  }
};

// ✅ Signup function using JSON and Axios (DO NOT use fetch here)
export const signupUser = async (userData) => {
  try {
    const response = await api.post("/auth/signup", {
      username: userData.username,
      password: userData.password,
      email: userData.email,
    });

    console.log("Signup response data:", response.data);
    return response.data;
  } catch (error) {
    console.error("Signup error:", error);
    throw error;
  }
};
