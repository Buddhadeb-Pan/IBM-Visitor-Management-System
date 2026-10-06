import { useState, useEffect } from "react";
import "./App.css";

// Backend API Base URLs (configured via VITE_API_URL with localhost fallback)
const BACKEND_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
const API_URL = `${BACKEND_URL}/api/visitors`;
const AUTH_URL = `${BACKEND_URL}/api/auth`;

// Default empty form state for visitors
const initialFormState = {
  name: "",
  mobileNumber: "",
  email: "",
  organization: "",
  personToMeet: "",
  purpose: "",
  visitDateTime: "",
  status: "Checked In",
};

function App() {
  // Authentication states
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authMode, setAuthMode] = useState("login"); // "login" or "signup"
  const [authData, setAuthData] = useState({ email: "", password: "" });
  const [authLoading, setAuthLoading] = useState(false);

  // Visitor records states
  const [visitors, setVisitors] = useState([]);
  const [formData, setFormData] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Feedback notifications
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Helper to show success message and auto-hide it after 4 seconds
  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setErrorMessage("");
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  // Helper to show error message
  const showError = (msg) => {
    setErrorMessage(msg);
    setSuccessMessage("");
  };

  // 1. Check if the user is already authenticated on mount
  const checkAuth = async () => {
    try {
      const response = await fetch(`${AUTH_URL}/me`, {
        credentials: "include", // Send HttpOnly cookie
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    } finally {
      setAuthChecking(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // 2. Fetch visitors from backend when user logs in or search query changes
  const fetchVisitors = async (search = "") => {
    setLoading(true);
    try {
      const url = search.trim()
        ? `${API_URL}?search=${encodeURIComponent(search.trim())}`
        : API_URL;

      const response = await fetch(url, {
        credentials: "include", // Send HttpOnly cookie
      });

      if (response.status === 401) {
        setCurrentUser(null);
        showError("Session expired. Please log in again.");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch visitors from server");
      }

      const data = await response.json();
      setVisitors(data);
    } catch (error) {
      showError(error.message || "Failed to load visitors");
    } finally {
      setLoading(false);
    }
  };

  // When currentUser changes to logged in, load their visitor records
  useEffect(() => {
    if (currentUser) {
      fetchVisitors();
    } else {
      setVisitors([]);
    }
  }, [currentUser]);

  // Handle changes in Auth form
  const handleAuthChange = (e) => {
    const { name, value } = e.target;
    setAuthData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Submit Login or Signup
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const trimmedEmail = authData.email.trim();
    const { password } = authData;

    if (!trimmedEmail || !password) {
      showError("Please enter both email and password.");
      return;
    }

    if (authMode === "signup" && password.length < 6) {
      showError("Password must be at least 6 characters long.");
      return;
    }

    setAuthLoading(true);
    try {
      const endpoint = authMode === "signup" ? "signup" : "login";
      const response = await fetch(`${AUTH_URL}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication request failed.");
      }

      setCurrentUser(data.user);
      setAuthData({ email: "", password: "" });
      showSuccess(
        authMode === "signup"
          ? "Account registered and logged in successfully!"
          : "Logged in successfully!"
      );
    } catch (error) {
      showError(error.message || "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle user logout
  const handleLogout = async () => {
    try {
      await fetch(`${AUTH_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore network errors during logout
    }
    setCurrentUser(null);
    setVisitors([]);
    setEditingId(null);
    setFormData(initialFormState);
    setSearchTerm("");
    showSuccess("Logged out successfully.");
  };

  // Handle changes in visitor form input fields
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Add or Update visitor
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Frontend validation: Check that all fields are filled
    const {
      name,
      mobileNumber,
      email,
      organization,
      personToMeet,
      purpose,
      visitDateTime,
      status,
    } = formData;

    if (
      !name.trim() ||
      !mobileNumber.trim() ||
      !email.trim() ||
      !organization.trim() ||
      !personToMeet.trim() ||
      !purpose.trim() ||
      !visitDateTime.trim() ||
      !status.trim()
    ) {
      showError("Please fill in all the required fields.");
      return;
    }

    // Validate Indian mobile number: 10 digits starting with 6, 7, 8, or 9
    const mobileRegex = /^[6-9][0-9]{9}$/;
    if (!mobileRegex.test(mobileNumber.trim())) {
      showError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    const payload = {
      ...formData,
      name: name.trim(),
      mobileNumber: mobileNumber.trim(),
      email: email.trim(),
      organization: organization.trim(),
      personToMeet: personToMeet.trim(),
      purpose: purpose.trim(),
      visitDateTime: visitDateTime.trim(),
      status: status.trim(),
    };

    try {
      if (editingId) {
        // UPDATE existing visitor
        const response = await fetch(`${API_URL}/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        if (response.status === 401) {
          setCurrentUser(null);
          showError("Session expired. Please log in again.");
          return;
        }

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to update visitor");
        }

        showSuccess("Visitor details updated successfully!");
        setEditingId(null);
      } else {
        // ADD new visitor
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        if (response.status === 401) {
          setCurrentUser(null);
          showError("Session expired. Please log in again.");
          return;
        }

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to add visitor");
        }

        showSuccess("New visitor registered successfully!");
      }

      // Reset form and refresh table
      setFormData(initialFormState);
      fetchVisitors(searchTerm);
    } catch (error) {
      showError(error.message || "Operation failed.");
    }
  };

  // Edit button clicked: Fill existing form with visitor's data
  const handleEdit = (visitor) => {
    setEditingId(visitor._id);
    setFormData({
      name: visitor.name || "",
      mobileNumber: visitor.mobileNumber || "",
      email: visitor.email || "",
      organization: visitor.organization || "",
      personToMeet: visitor.personToMeet || "",
      purpose: visitor.purpose || "",
      // Slice to format YYYY-MM-DDTHH:mm for datetime-local input
      visitDateTime: visitor.visitDateTime ? visitor.visitDateTime.slice(0, 16) : "",
      status: visitor.status || "Checked In",
    });
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setErrorMessage("");
  };

  // Delete visitor with confirmation
  const handleDelete = async (id, name) => {
    const isConfirmed = window.confirm(
      `Are you sure you want to delete the visitor record for "${name}"?`
    );

    if (!isConfirmed) return;

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.status === 401) {
        setCurrentUser(null);
        showError("Session expired. Please log in again.");
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to delete visitor");
      }

      showSuccess("Visitor record deleted successfully!");

      // If user was editing this deleted visitor, reset form
      if (editingId === id) {
        handleCancelEdit();
      }

      fetchVisitors(searchTerm);
    } catch (error) {
      showError(error.message || "Failed to delete visitor.");
    }
  };

  // Search handling
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchVisitors(searchTerm);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    fetchVisitors("");
  };

  // Format date and time for display in the table
  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return "-";
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) {
      return dateTimeString.replace("T", " ");
    }
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate actual summary statistics from the current user's records
  const totalVisitorsCount = visitors.length;
  const checkedInCount = visitors.filter((v) => v.status === "Checked In").length;
  const checkedOutCount = visitors.filter((v) => v.status === "Checked Out").length;

  // Initial loading state while verifying existing session
  if (authChecking) {
    return (
      <div className="auth-loading-screen">
        <div className="spinner-large" />
        <p>Connecting to Visitor Management...</p>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Top Application Header */}
      <header className="app-navbar">
        <div className="navbar-container">
          <div className="brand-block">
            <div className="brand-icon">
              {/* Modern badge icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <path d="M8 14h.01" />
                <path d="M12 14h.01" />
                <path d="M16 14h.01" />
                <path d="M8 18h.01" />
                <path d="M12 18h.01" />
                <path d="M16 18h.01" />
              </svg>
            </div>
            <div>
              <h1 className="brand-title">Employee Visitor Management</h1>
              <p className="brand-subtitle">Workplace & Campus Access System</p>
            </div>
          </div>

          {/* User profile & Logout on the right */}
          {currentUser && (
            <div className="navbar-user-actions">
              <div className="user-profile-badge">
                <div className="user-avatar">
                  {currentUser.email.charAt(0).toUpperCase()}
                </div>
                <div className="user-details">
                  <span className="user-label">Logged in as</span>
                  <span className="user-email-text" title={currentUser.email}>
                    {currentUser.email}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-logout"
                onClick={handleLogout}
                title="Logout from session"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Success Alert Banner */}
        {successMessage && (
          <div className="toast-banner toast-success" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="toast-banner toast-error" role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* When NOT logged in: Show Polished Auth Card */}
        {!currentUser ? (
          <div className="auth-wrapper">
            <div className="card auth-card">
              <div className="auth-header-block">
                <div className="auth-badge-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h2>{authMode === "login" ? "Welcome Back" : "Create Account"}</h2>
                <p className="auth-subtitle">
                  {authMode === "login"
                    ? "Enter your credentials to securely access visitor records."
                    : "Register with your email to start managing company visitors."}
                </p>
              </div>

              {/* Segmented Mode Switcher */}
              <div className="auth-segmented-switch">
                <button
                  type="button"
                  className={`switch-tab ${authMode === "login" ? "active" : ""}`}
                  onClick={() => {
                    setAuthMode("login");
                    setErrorMessage("");
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={`switch-tab ${authMode === "signup" ? "active" : ""}`}
                  onClick={() => {
                    setAuthMode("signup");
                    setErrorMessage("");
                  }}
                >
                  Register
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="auth-email">Email Address *</label>
                  <input
                    id="auth-email"
                    type="email"
                    name="email"
                    value={authData.email}
                    onChange={handleAuthChange}
                    placeholder="e.g. employee@company.com"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="auth-password">Password *</label>
                  <input
                    id="auth-password"
                    type="password"
                    name="password"
                    value={authData.password}
                    onChange={handleAuthChange}
                    placeholder={
                      authMode === "signup"
                        ? "At least 6 characters"
                        : "Enter your password"
                    }
                    autoComplete={authMode === "signup" ? "new-password" : "current-password"}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={authLoading}
                >
                  {authLoading ? (
                    <span className="btn-loading-content">
                      <span className="spinner-inline" />
                      <span>Processing...</span>
                    </span>
                  ) : authMode === "login" ? (
                    "Sign In"
                  ) : (
                    "Create Account"
                  )}
                </button>

                <div className="auth-footer-prompt">
                  {authMode === "login" ? (
                    <span>
                      Don't have an account?{" "}
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => {
                          setAuthMode("signup");
                          setErrorMessage("");
                        }}
                      >
                        Create one here
                      </button>
                    </span>
                  ) : (
                    <span>
                      Already registered?{" "}
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => {
                          setAuthMode("login");
                          setErrorMessage("");
                        }}
                      >
                        Sign in instead
                      </button>
                    </span>
                  )}
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* When LOGGED IN: Summary Stats + Visitor Form + Visitor Records */
          <>
            {/* Compact Summary Cards (KPIs calculated from actual user records) */}
            <section className="stats-grid">
              {/* Card 1: Total Visitors */}
              <div className="stat-card stat-total">
                <div className="stat-icon-wrapper total-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="stat-content">
                  <span className="stat-label">Total Visitors</span>
                  <strong className="stat-value">{totalVisitorsCount}</strong>
                  <span className="stat-hint">Registered records</span>
                </div>
              </div>

              {/* Card 2: Checked In */}
              <div className="stat-card stat-in">
                <div className="stat-icon-wrapper in-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <polyline points="16 11 18 13 22 9" />
                  </svg>
                </div>
                <div className="stat-content">
                  <span className="stat-label">Checked In</span>
                  <strong className="stat-value text-green">{checkedInCount}</strong>
                  <span className="stat-hint">Currently on premise</span>
                </div>
              </div>

              {/* Card 3: Checked Out */}
              <div className="stat-card stat-out">
                <div className="stat-icon-wrapper out-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div className="stat-content">
                  <span className="stat-label">Checked Out</span>
                  <strong className="stat-value text-slate">{checkedOutCount}</strong>
                  <span className="stat-hint">Completed visits</span>
                </div>
              </div>
            </section>

            {/* Visitor Form Section */}
            <section className="card card-form">
              <div className="card-header">
                <div className="card-header-left">
                  <div className="header-icon-box">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                  <div>
                    <h2>{editingId ? "Edit Visitor Details" : "Register New Visitor"}</h2>
                    <p className="card-subtitle">
                      {editingId
                        ? "Update details for the selected visitor record"
                        : "Enter visitor credentials and appointment information"}
                    </p>
                  </div>
                </div>

                {editingId && (
                  <span className="badge badge-editing">Editing Mode</span>
                )}
              </div>

              <form onSubmit={handleSubmit} className="form-container">
                <div className="form-grid">
                  {/* 1. Visitor Name */}
                  <div className="form-group">
                    <label htmlFor="name">Visitor Name *</label>
                    <input
                      id="name"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Rahul Sharma"
                      required
                    />
                  </div>

                  {/* 2. Mobile Number */}
                  <div className="form-group">
                    <label htmlFor="mobileNumber">Mobile Number *</label>
                    <input
                      id="mobileNumber"
                      type="tel"
                      name="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={handleChange}
                      placeholder="e.g. 9876543210 (10 digits)"
                      required
                    />
                  </div>

                  {/* 3. Email Address */}
                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g. rahul@example.com"
                      required
                    />
                  </div>

                  {/* 4. Organization / College Name */}
                  <div className="form-group">
                    <label htmlFor="organization">Organization / College Name *</label>
                    <input
                      id="organization"
                      type="text"
                      name="organization"
                      value={formData.organization}
                      onChange={handleChange}
                      placeholder="e.g. ABC Tech Corp"
                      required
                    />
                  </div>

                  {/* 5. Person to Meet */}
                  <div className="form-group">
                    <label htmlFor="personToMeet">Person to Meet *</label>
                    <input
                      id="personToMeet"
                      type="text"
                      name="personToMeet"
                      value={formData.personToMeet}
                      onChange={handleChange}
                      placeholder="e.g. Ananya Sen"
                      required
                    />
                  </div>

                  {/* 6. Purpose of Visit */}
                  <div className="form-group">
                    <label htmlFor="purpose">Purpose of Visit *</label>
                    <input
                      id="purpose"
                      type="text"
                      name="purpose"
                      value={formData.purpose}
                      onChange={handleChange}
                      placeholder="e.g. Job Interview / Client Meeting"
                      required
                    />
                  </div>

                  {/* 7. Date and Time of Visit */}
                  <div className="form-group">
                    <label htmlFor="visitDateTime">Date & Time of Visit *</label>
                    <input
                      id="visitDateTime"
                      type="datetime-local"
                      name="visitDateTime"
                      value={formData.visitDateTime}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  {/* 8. Status */}
                  <div className="form-group">
                    <label htmlFor="status">Visit Status *</label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      required
                    >
                      <option value="Checked In">Checked In</option>
                      <option value="Checked Out">Checked Out</option>
                    </select>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    <span>{editingId ? "Update Visitor Details" : "Register Visitor"}</span>
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCancelEdit}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </section>

            {/* Visitor Records Table Section */}
            <section className="card card-table">
              <div className="table-header-row">
                <div className="table-title-box">
                  <h2>Visitor Records</h2>
                  <span className="badge badge-count">
                    {loading ? "Searching..." : `${visitors.length} total`}
                  </span>
                </div>

                {/* Polished Search Bar */}
                <form onSubmit={handleSearchSubmit} className="search-bar">
                  <div className="search-input-wrapper">
                    <span className="search-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search by visitor name or mobile number..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        className="btn-clear-search"
                        onClick={handleClearSearch}
                        title="Clear search query"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <button type="submit" className="btn btn-primary btn-search">
                    Search
                  </button>
                </form>
              </div>

              {/* Responsive Table Container */}
              <div className="table-wrapper">
                <table className="visitor-table">
                  <thead>
                    <tr>
                      <th>Visitor Name</th>
                      <th>Mobile Number</th>
                      <th>Email</th>
                      <th>Organization / College</th>
                      <th>Person to Meet</th>
                      <th>Purpose</th>
                      <th>Date & Time</th>
                      <th>Status</th>
                      <th className="th-actions">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitors.length === 0 ? (
                      <tr>
                        <td colSpan="9">
                          <div className="empty-state-box">
                            <div className="empty-icon-circle">
                              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="8" y1="12" x2="16" y2="12" />
                              </svg>
                            </div>
                            <h3>No visitor records found</h3>
                            <p>
                              {searchTerm
                                ? `No records matched "${searchTerm}". Try a different name or clear the search.`
                                : "No visitors registered yet. Use the form above to add your first visitor."}
                            </p>
                            {searchTerm && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={handleClearSearch}
                              >
                                Clear Search Filter
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      visitors.map((visitor) => (
                        <tr key={visitor._id}>
                          <td>
                            <strong className="visitor-name-cell">{visitor.name}</strong>
                          </td>
                          <td className="cell-monospace">{visitor.mobileNumber}</td>
                          <td className="cell-muted">{visitor.email}</td>
                          <td>{visitor.organization}</td>
                          <td>{visitor.personToMeet}</td>
                          <td className="cell-purpose">{visitor.purpose}</td>
                          <td className="cell-nowrap">{formatDateTime(visitor.visitDateTime)}</td>
                          <td>
                            <span
                              className={`badge ${
                                visitor.status === "Checked In"
                                  ? "badge-in"
                                  : "badge-out"
                              }`}
                            >
                              <span className="badge-dot" />
                              {visitor.status}
                            </span>
                          </td>
                          <td className="cell-actions">
                            <button
                              type="button"
                              className="btn-action btn-edit"
                              onClick={() => handleEdit(visitor)}
                              title="Edit this record"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              className="btn-action btn-delete"
                              onClick={() => handleDelete(visitor._id, visitor.name)}
                              title="Delete this record"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              <span>Delete</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
