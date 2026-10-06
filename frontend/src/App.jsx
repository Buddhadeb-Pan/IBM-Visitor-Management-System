import { useState, useEffect } from "react";
import "./App.css";

// Backend API Base URLs
const API_URL = "http://localhost:5000/api/visitors";
const AUTH_URL = "http://localhost:5000/api/auth";

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
    } catch (err) {
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
    } catch (err) {
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
    return date.toLocaleString();
  };

  // Initial loading state while verifying existing session
  if (authChecking) {
    return (
      <div className="app-container" style={{ textAlign: "center", paddingTop: "60px" }}>
        <p style={{ color: "#64748b", fontSize: "16px" }}>Checking authentication...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1>Employee Visitor Management System</h1>
        <p>Manage, track, and record company and campus visitors</p>

        {/* User bar when logged in */}
        {currentUser && (
          <div className="user-nav">
            <div className="user-badge">
              <span className="user-label">Logged in:</span>
              <strong className="user-email">{currentUser.email}</strong>
            </div>
            <button type="button" className="btn btn-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </header>

      {/* Success Notification */}
      {successMessage && (
        <div className="alert-success" role="alert">
          {successMessage}
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="alert-error" role="alert">
          {errorMessage}
        </div>
      )}

      {/* When NOT logged in: Show Signup/Login Form */}
      {!currentUser ? (
        <section className="card auth-card">
          <h2>{authMode === "login" ? "Sign In to Your Account" : "Create a New Account"}</h2>
          <p className="auth-subtitle">
            {authMode === "login"
              ? "Enter your email and password to access your visitor records."
              : "Register with your email and password to start managing your visitors."}
          </p>

          <form onSubmit={handleAuthSubmit}>
            <div className="form-group" style={{ marginBottom: "16px" }}>
              <label htmlFor="auth-email">Email Address *</label>
              <input
                id="auth-email"
                type="email"
                name="email"
                value={authData.email}
                onChange={handleAuthChange}
                placeholder="e.g. employee@company.com"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: "20px" }}>
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
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", padding: "10px" }}
              disabled={authLoading}
            >
              {authLoading
                ? "Processing..."
                : authMode === "login"
                ? "Sign In"
                : "Create Account"}
            </button>

            <div className="auth-toggle-container">
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
                    Sign up here
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => {
                      setAuthMode("login");
                      setErrorMessage("");
                    }}
                  >
                    Sign in here
                  </button>
                </span>
              )}
            </div>
          </form>
        </section>
      ) : (
        /* When LOGGED IN: Show Visitor Form and List */
        <>
          {/* Form Section */}
          <section className="card">
            <h2>{editingId ? "Edit Visitor Details" : "Add New Visitor"}</h2>
            <form onSubmit={handleSubmit}>
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
                    placeholder="e.g. 9876543210"
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
                  <label htmlFor="visitDateTime">Date and Time of Visit *</label>
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
                  <label htmlFor="status">Status *</label>
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
                  {editingId ? "Update Visitor" : "Add Visitor"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>

          {/* Visitor List Section */}
          <section className="card">
            <h2>Visitor Records</h2>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="search-bar-container">
              <input
                type="text"
                className="search-input"
                placeholder="Search by Visitor Name or Mobile Number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                Search
              </button>
              {searchTerm && (
                <button
                  type="button"
                  className="btn btn-clear"
                  onClick={handleClearSearch}
                >
                  Clear
                </button>
              )}
            </form>

            <div className="search-info">
              {loading
                ? "Loading visitors..."
                : `Showing ${visitors.length} visitor record(s)`}
            </div>

            {/* Visitors Table */}
            <div className="table-container">
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
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="no-data">
                        {loading
                          ? "Loading records..."
                          : "No visitor records found. You can add one above."}
                      </td>
                    </tr>
                  ) : (
                    visitors.map((visitor) => (
                      <tr key={visitor._id}>
                        <td>
                          <strong>{visitor.name}</strong>
                        </td>
                        <td>{visitor.mobileNumber}</td>
                        <td>{visitor.email}</td>
                        <td>{visitor.organization}</td>
                        <td>{visitor.personToMeet}</td>
                        <td>{visitor.purpose}</td>
                        <td>{formatDateTime(visitor.visitDateTime)}</td>
                        <td>
                          <span
                            className={`badge ${
                              visitor.status === "Checked In"
                                ? "badge-in"
                                : "badge-out"
                            }`}
                          >
                            {visitor.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-edit"
                            onClick={() => handleEdit(visitor)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(visitor._id, visitor.name)}
                          >
                            Delete
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
    </div>
  );
}

export default App;
