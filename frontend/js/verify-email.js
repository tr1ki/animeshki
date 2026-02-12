import { apiRequest } from "./api.js";
import { setYear } from "./ui.js";

const elements = {
  verificationMessage: document.getElementById("verificationMessage"),
  loadingSpinner: document.getElementById("loadingSpinner"),
  verificationResult: document.getElementById("verificationResult"),
  verificationActions: document.getElementById("verificationActions"),
  resendButton: document.getElementById("resendButton"),
};

const showResult = (message, isSuccess = true) => {
  elements.verificationMessage.classList.add("hidden");
  elements.loadingSpinner.classList.add("hidden");
  elements.verificationResult.classList.remove("hidden");
  elements.verificationActions.classList.remove("hidden");
  
  elements.verificationResult.textContent = message;
  elements.verificationResult.className = isSuccess ? "success-message" : "error-message";
};

const showError = (message) => {
  showResult(message, false);
};

const verifyEmail = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (!token) {
    showError("Verification token is missing. Please check your email link or request a new verification email.");
    return;
  }

  try {
    const response = await apiRequest(`/auth/verify-email?token=${token}`, {
      method: "GET"
    });

    showResult("Email verified successfully! You can now log in to your account.", true);
    
    // Auto-redirect to login after 3 seconds
    setTimeout(() => {
      window.location.href = "./login.html";
    }, 3000);

  } catch (error) {
    const errorMessage = error.message || "Email verification failed. The link may have expired or is invalid.";
    showError(errorMessage);
  }
};

const resendVerificationEmail = async () => {
  try {
    elements.resendButton.disabled = true;
    elements.resendButton.textContent = "Sending...";

    const token = localStorage.getItem("animeshki_token");
    if (!token) {
      showError("Please log in to resend verification email.");
      elements.resendButton.disabled = false;
      elements.resendButton.textContent = "Resend Verification Email";
      return;
    }

    const response = await apiRequest("/auth/resend-verification", {
      method: "POST",
      authToken: token
    });

    showResult("Verification email sent! Please check your inbox.", true);
    
  } catch (error) {
    const errorMessage = error.message || "Failed to resend verification email.";
    showError(errorMessage);
  } finally {
    elements.resendButton.disabled = false;
    elements.resendButton.textContent = "Resend Verification Email";
  }
};

const bindEvents = () => {
  elements.resendButton.addEventListener("click", resendVerificationEmail);
};

const init = () => {
  setYear();
  bindEvents();
  verifyEmail();
};

init();
