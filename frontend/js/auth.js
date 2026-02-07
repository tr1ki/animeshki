import { apiRequest } from "./api.js";

const TOKEN_KEY = "animeshki_token";
const USER_KEY = "animeshki_user";

const parseStoredUser = () => {
  const raw = localStorage.getItem(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getStoredUser = () => parseStoredUser();

export const saveSession = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const hasRole = (user, allowedRoles = []) => Boolean(user && allowedRoles.includes(user.role));

export const registerUser = async ({ username, email, password }) => {
  const payload = await apiRequest("/auth/register", {
    method: "POST",
    body: { username, email, password },
  });

  saveSession(payload.token, payload.user);
  return payload.user;
};

export const loginUser = async ({ email, password }) => {
  const payload = await apiRequest("/auth/login", {
    method: "POST",
    body: { email, password },
  });

  saveSession(payload.token, payload.user);
  return payload.user;
};

export const fetchCurrentUser = async () => {
  const token = getToken();

  if (!token) {
    return null;
  }

  const user = await apiRequest("/users/me", {
    method: "GET",
    authToken: token,
  });

  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
};

export const hydrateUser = async () => {
  const token = getToken();

  if (!token) {
    return null;
  }

  try {
    return await fetchCurrentUser();
  } catch (error) {
    if (error.status === 401) {
      clearSession();
      return null;
    }

    throw error;
  }
};
