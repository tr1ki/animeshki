import { clearSession, getStoredUser, hydrateUser } from "./auth.js";
import { listMyManga } from "./manga.js";
import { formatRequestError, hideFeedback, setYear, showFeedback } from "./ui.js";
import { apiRequest } from "./api.js";

const elements = {
  logoutButton: document.getElementById("logoutButton"),
  uploadAnchor: document.getElementById("uploadAnchor"),
  profileUsername: document.getElementById("profileUsername"),
  profileEmail: document.getElementById("profileEmail"),
  profileRole: document.getElementById("profileRole"),
  profileJoined: document.getElementById("profileJoined"),
  avatarInitial: document.getElementById("avatarInitial"),
  mangaCount: document.getElementById("mangaCount"),
  reviewCount: document.getElementById("reviewCount"),
  favoriteCount: document.getElementById("favoriteCount"),
  editProfileButton: document.getElementById("editProfileButton"),
  changePasswordButton: document.getElementById("changePasswordButton"),
  profileFeedback: document.getElementById("profileFeedback"),
  // Edit Profile Modal
  editProfileModal: document.getElementById("editProfileModal"),
  editProfileForm: document.getElementById("editProfileForm"),
  editUsername: document.getElementById("editUsername"),
  editEmail: document.getElementById("editEmail"),
  saveProfileButton: document.getElementById("saveProfileButton"),
  closeEditProfile: document.getElementById("closeEditProfile"),
  cancelEdit: document.getElementById("cancelEdit"),
  // Change Password Modal
  changePasswordModal: document.getElementById("changePasswordModal"),
  changePasswordForm: document.getElementById("changePasswordForm"),
  currentPassword: document.getElementById("currentPassword"),
  newPassword: document.getElementById("newPassword"),
  confirmNewPassword: document.getElementById("confirmNewPassword"),
  changePasswordSubmit: document.getElementById("changePasswordSubmit"),
  closeChangePassword: document.getElementById("closeChangePassword"),
  cancelPassword: document.getElementById("cancelPassword"),
};

let currentUser = null;

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

const getInitial = (username) => {
  return username ? username.charAt(0).toUpperCase() : '?';
};

const capitalizeRole = (role) => {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Unknown';
};

const loadUserProfile = async () => {
  try {
    console.log("Loading user profile...");
    currentUser = await hydrateUser();
    console.log("User data:", currentUser);
    
    if (!currentUser) {
      console.log("No user found, redirecting to login");
      showFeedback(elements.profileFeedback, "Please login to view your profile", "error");
      setTimeout(() => {
        window.location.href = "./login.html";
      }, 2000);
      return;
    }

    // Update profile information
    console.log("Updating profile UI...");
    elements.profileUsername.textContent = currentUser.username || 'Unknown';
    elements.profileEmail.textContent = currentUser.email || 'Unknown';
    elements.profileRole.textContent = capitalizeRole(currentUser.role);
    elements.profileJoined.textContent = `Joined: ${formatDate(currentUser.createdAt || new Date())}`;
    elements.avatarInitial.textContent = getInitial(currentUser.username);

    console.log("Profile UI updated, loading stats...");
    // Load user statistics
    await loadUserStats();

  } catch (error) {
    console.error("Error loading profile:", error);
    showFeedback(elements.profileFeedback, formatRequestError(error), "error");
  }
};

const loadUserStats = async () => {
  try {
    // Load manga count
    const myManga = await listMyManga();
    elements.mangaCount.textContent = myManga.length;

    // TODO: Load review count and favorite count when APIs are available
    elements.reviewCount.textContent = "0";
    elements.favoriteCount.textContent = "0";

  } catch (error) {
    console.error("Failed to load user stats:", error);
    elements.mangaCount.textContent = "0";
    elements.reviewCount.textContent = "0";
    elements.favoriteCount.textContent = "0";
  }
};

const bindEvents = () => {
  elements.logoutButton.addEventListener("click", () => {
    clearSession();
    window.location.href = "./index.html";
  });

  // Edit Profile Modal Events
  elements.editProfileButton.addEventListener("click", openEditProfileModal);
  elements.closeEditProfile.addEventListener("click", closeEditProfileModal);
  elements.cancelEdit.addEventListener("click", closeEditProfileModal);
  elements.editProfileForm.addEventListener("submit", handleEditProfile);

  // Change Password Modal Events
  elements.changePasswordButton.addEventListener("click", openChangePasswordModal);
  elements.closeChangePassword.addEventListener("click", closeChangePasswordModal);
  elements.cancelPassword.addEventListener("click", closeChangePasswordModal);
  elements.changePasswordForm.addEventListener("submit", handleChangePassword);

  // Close modals when clicking outside
  elements.editProfileModal.addEventListener("click", (e) => {
    if (e.target === elements.editProfileModal) {
      closeEditProfileModal();
    }
  });

  elements.changePasswordModal.addEventListener("click", (e) => {
    if (e.target === elements.changePasswordModal) {
      closeChangePasswordModal();
    }
  });
};

const openEditProfileModal = () => {
  if (!currentUser) return;
  
  elements.editUsername.value = currentUser.username || '';
  elements.editEmail.value = currentUser.email || '';
  elements.editProfileModal.classList.remove("hidden");
  hideFeedback(elements.profileFeedback);
};

const closeEditProfileModal = () => {
  elements.editProfileModal.classList.add("hidden");
  elements.editProfileForm.reset();
};

const handleEditProfile = async (e) => {
  e.preventDefault();
  
  const username = elements.editUsername.value.trim();
  const email = elements.editEmail.value.trim();
  
  if (!username || !email) {
    showFeedback(elements.profileFeedback, "Please fill in all fields", "error");
    return;
  }
  
  if (username.length < 3) {
    showFeedback(elements.profileFeedback, "Username must be at least 3 characters", "error");
    return;
  }
  
  const originalText = elements.saveProfileButton.textContent;
  elements.saveProfileButton.disabled = true;
  elements.saveProfileButton.textContent = "Saving...";
  
  try {
    const token = localStorage.getItem("animeshki_token");
    const updatedUser = await apiRequest("/users/profile", {
      method: "PUT",
      body: { username, email },
      authToken: token
    });
    
    // Update stored user data
    localStorage.setItem("animeshki_user", JSON.stringify(updatedUser));
    currentUser = updatedUser;
    
    // Update UI
    elements.profileUsername.textContent = updatedUser.username;
    elements.profileEmail.textContent = updatedUser.email;
    elements.avatarInitial.textContent = getInitial(updatedUser.username);
    
    closeEditProfileModal();
    showFeedback(elements.profileFeedback, "Profile updated successfully!", "success");
    
  } catch (error) {
    showFeedback(elements.profileFeedback, formatRequestError(error), "error");
  } finally {
    elements.saveProfileButton.disabled = false;
    elements.saveProfileButton.textContent = originalText;
  }
};

const openChangePasswordModal = () => {
  elements.changePasswordModal.classList.remove("hidden");
  hideFeedback(elements.profileFeedback);
};

const closeChangePasswordModal = () => {
  elements.changePasswordModal.classList.add("hidden");
  elements.changePasswordForm.reset();
};

const handleChangePassword = async (e) => {
  e.preventDefault();
  
  const currentPassword = elements.currentPassword.value;
  const newPassword = elements.newPassword.value;
  const confirmNewPassword = elements.confirmNewPassword.value;
  
  if (!currentPassword || !newPassword || !confirmNewPassword) {
    showFeedback(elements.profileFeedback, "Please fill in all fields", "error");
    return;
  }
  
  if (newPassword.length < 6) {
    showFeedback(elements.profileFeedback, "New password must be at least 6 characters", "error");
    return;
  }
  
  if (newPassword !== confirmNewPassword) {
    showFeedback(elements.profileFeedback, "New passwords do not match", "error");
    return;
  }
  
  const originalText = elements.changePasswordSubmit.textContent;
  elements.changePasswordSubmit.disabled = true;
  elements.changePasswordSubmit.textContent = "Changing...";
  
  try {
    const token = localStorage.getItem("animeshki_token");
    await apiRequest("/auth/change-password", {
      method: "POST",
      body: { currentPassword, newPassword },
      authToken: token
    });
    
    closeChangePasswordModal();
    showFeedback(elements.profileFeedback, "Password changed successfully!", "success");
    
  } catch (error) {
    showFeedback(elements.profileFeedback, formatRequestError(error), "error");
  } finally {
    elements.changePasswordSubmit.disabled = false;
    elements.changePasswordSubmit.textContent = originalText;
  }
};

const init = async () => {
  console.log("Initializing profile page...");
  
  // Check if all elements exist
  const missingElements = [];
  Object.keys(elements).forEach(key => {
    if (!elements[key]) {
      missingElements.push(key);
    }
  });
  
  if (missingElements.length > 0) {
    console.error("Missing elements:", missingElements);
    return;
  }
  
  setYear();
  bindEvents();
  await loadUserProfile();
};

init();
