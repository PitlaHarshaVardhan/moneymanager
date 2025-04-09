import { Component } from "react";
import Cookies from "js-cookie";
import { Redirect } from "react-router-dom";
import "./index.css";

class Login extends Component {
  state = {
    email: "",
    password: "",
    showSubmitError: false,
    errorMsg: "",
  };

  onChangeEmail = (event) => {
    this.setState({ email: event.target.value });
  };

  onChangePassword = (event) => {
    this.setState({ password: event.target.value });
  };

  onSubmitSuccess = (data) => {
    const { history } = this.props;
    Cookies.set("jwt_token", data.token, { expires: 30, path: "/" });
    localStorage.setItem("user", JSON.stringify({ userId: data.userId }));
    history.replace("/");
  };

  onSubmitFailure = (errorMsg) => {
    this.setState({ showSubmitError: true, errorMsg });
  };

  submitForm = async (event) => {
    event.preventDefault();
    const { email, password } = this.state;

    if (!email || !password) {
      this.onSubmitFailure("Email and password are required");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.onSubmitFailure("Please enter a valid email");
      return;
    }

    const userDetails = { email, password };
    const url = "http://localhost:3001/login";
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
        this.onSubmitSuccess(data);
      } else {
        this.onSubmitFailure(data.error || "Invalid credentials");
      }
    } catch (error) {
      this.onSubmitFailure("Network error. Please try again.");
    }
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

  render() {
    const { showSubmitError, errorMsg } = this.state;
    const jwtToken = Cookies.get("jwt_token");
    if (jwtToken !== undefined) {
      return <Redirect to="/" />;
    }
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="logo-container">
            <img
              src="https://cdn-icons-png.flaticon.com/512/2995/2995353.png" // Money manager icon
              className="logo-image"
              alt="money manager logo"
            />
            <h1 className="app-title">Money Manager</h1>
          </div>
          <form className="login-form" onSubmit={this.submitForm}>
            {this.renderEmailField()}
            {this.renderPasswordField()}
            <button type="submit" className="login-btn">
              Log In
            </button>
            {showSubmitError && (
              <div className="error-container">
                <p className="error-msg">{errorMsg}</p>
                <a href="/register" className="register-link">
                  Create Account
                </a>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }
}

export default Login;
