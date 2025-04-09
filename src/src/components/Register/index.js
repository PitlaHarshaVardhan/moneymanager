import { Component } from "react";
import { Redirect } from "react-router-dom";
import Cookies from "js-cookie";
import "./index.css";

class Register extends Component {
  state = {
    username: "",
    email: "",
    password: "",
    showSubmitError: false,
    errorMsg: "",
  };

  onChangeUsername = (event) => {
    this.setState({ username: event.target.value });
  };

  onChangeEmail = (event) => {
    this.setState({ email: event.target.value });
  };

  onChangePassword = (event) => {
    this.setState({ password: event.target.value });
  };

  onSubmitSuccess = () => {
    const { history } = this.props;
    history.replace("/login");
  };

  onSubmitFailure = (errorMsg) => {
    this.setState({ showSubmitError: true, errorMsg });
  };

  submitForm = async (event) => {
    event.preventDefault();
    const { username, email, password } = this.state;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.onSubmitFailure("Please enter a valid email");
      return;
    }

    if (!username || !password) {
      this.onSubmitFailure("All fields are required");
      return;
    }

    const userDetails = { username, email, password };
    const url = "http://localhost:3001/register";
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userDetails),
    };

    try {
      const response = await fetch(url, options);
      const data = await response.json();
      if (response.ok) {
        this.onSubmitSuccess();
      } else {
        this.onSubmitFailure(data.error || "Registration failed. Try again.");
      }
    } catch (error) {
      this.onSubmitFailure("Network error. Please try again.");
    }
  };

  renderUsernameField = () => {
    const { username } = this.state;
    return (
      <div className="input-wrapper">
        <label className="input-label" htmlFor="username">
          Username
        </label>
        <input
          type="text"
          id="username"
          className="input-field"
          value={username}
          onChange={this.onChangeUsername}
          placeholder="Enter your username"
          required
        />
      </div>
    );
  };

  renderEmailField = () => {
    const { email } = this.state;
    return (
      <div className="input-wrapper">
        <label className="input-label" htmlFor="email">
          Email
        </label>
        <input
          type="email"
          id="email"
          className="input-field"
          value={email}
          onChange={this.onChangeEmail}
          placeholder="Enter your email"
          required
        />
      </div>
    );
  };

  renderPasswordField = () => {
    const { password } = this.state;
    return (
      <div className="input-wrapper">
        <label className="input-label" htmlFor="password">
          Password
        </label>
        <input
          type="password"
          id="password"
          className="input-field"
          value={password}
          onChange={this.onChangePassword}
          placeholder="Enter your password"
          required
        />
      </div>
    );
  };

  render() {
    const { showSubmitError, errorMsg } = this.state;
    const jwtToken = Cookies.get("jwt_token");
    if (jwtToken !== undefined) {
      return <Redirect to="/" />;
    }
    return (
      <div className="register-container">
        <div className="register-card">
          <div className="logo-container">
            <img
              src="https://cdn-icons-png.flaticon.com/512/2995/2995353.png" // Money Manager logo
              className="logo-image"
              alt="money manager logo"
            />
            <h1 className="app-title">Money Manager</h1>
          </div>
          <form className="register-form" onSubmit={this.submitForm}>
            {this.renderUsernameField()}
            {this.renderEmailField()}
            {this.renderPasswordField()}
            <button type="submit" className="register-btn">
              Register
            </button>
            {showSubmitError && (
              <div className="error-container">
                <p className="error-msg">{errorMsg}</p>
                <a href="/login" className="login-link">
                  Already have an account? Login
                </a>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }
}

export default Register;
