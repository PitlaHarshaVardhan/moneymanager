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

    Cookies.set("jwt_token", data.token, {
      expires: 30,
      path: "/",
    });

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
      this.onSubmitFailure("Please enter a valid email with @");
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
      console.log("Login response:", data);
      if (response.ok) {
        this.onSubmitSuccess(data);
      } else {
        this.onSubmitFailure(data.error || "Something went wrong!");
      }
    } catch (error) {
      console.error("Network error during login:", error);
      this.onSubmitFailure("Network error. Please try again.");
    }
  };

  renderPasswordField = () => {
    const { password } = this.state;
    return (
      <>
        <label className="input-label3" htmlFor="password">
          PASSWORD
        </label>
        <input
          type="password"
          id="password"
          className="password-input-field3"
          value={password}
          onChange={this.onChangePassword}
          required
        />
      </>
    );
  };

  renderEmailField = () => {
    const { email } = this.state;
    return (
      <>
        <label className="input-label3" htmlFor="email">
          EMAIL
        </label>
        <input
          type="email"
          id="email"
          className="email-input-field3"
          value={email}
          onChange={this.onChangeEmail}
          required
        />
      </>
    );
  };

  render() {
    const { showSubmitError, errorMsg } = this.state;
    const jwtToken = Cookies.get("jwt_token");
    if (jwtToken !== undefined) {
      return <Redirect to="/" />;
    }
    return (
      <div className="login-form-container3">
        <form className="form-container3" onSubmit={this.submitForm}>
          <img
            src="https://assets.ccbp.in/frontend/react-js/nxt-trendz-logo-img.png"
            className="login-website-logo-desktop-image3"
            alt="website logo"
          />
          <div className="input-container3">{this.renderEmailField()}</div>
          <div className="input-container3">{this.renderPasswordField()}</div>
          <button type="submit" className="login-button3">
            Login
          </button>
          {showSubmitError && (
            <div>
              <p className="error-message3">*{errorMsg}</p>
              <a href="/register">Register Here</a>
            </div>
          )}
        </form>
      </div>
    );
  }
}

export default Login;
