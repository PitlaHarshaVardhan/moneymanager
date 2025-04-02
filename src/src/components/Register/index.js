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
    console.log(errorMsg);
    this.setState({ showSubmitError: true, errorMsg });
  };

  submitForm = async (event) => {
    event.preventDefault();
    const { username, email, password } = this.state;
    const userDetails = { username, email, password };
    const url = "http://localhost:3001/register"; // Ensure this matches the backend route
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
        this.onSubmitSuccess(); // Redirect to login if successful
      } else {
        this.onSubmitFailure(
          data.error_msg || "Registration failed. Try again."
        );
      }
    } catch (error) {
      console.error("Error during registration:", error);
      this.onSubmitFailure("An unexpected error occurred. Please try again.");
    }
  };

  renderPasswordField = () => {
    const { password } = this.state;
    return (
      <>
        <label className="input-label4" htmlFor="password">
          PASSWORD
        </label>
        <input
          type="password"
          id="password"
          className="password-input-field4"
          value={password}
          onChange={this.onChangePassword}
        />
      </>
    );
  };

  renderEmailField = () => {
    const { email } = this.state;
    return (
      <>
        <label className="input-label4" htmlFor="email">
          EMAIL
        </label>
        <input
          type="email"
          id="email"
          className="email-input-field4"
          value={email}
          onChange={this.onChangeEmail}
        />
      </>
    );
  };

  renderUsernameField = () => {
    const { username } = this.state;
    return (
      <>
        <label className="input-label4" htmlFor="username">
          USERNAME
        </label>
        <input
          type="text"
          id="username"
          className="username-input-field4"
          value={username}
          onChange={this.onChangeUsername}
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
      <div className="register-form-container4">
        <form className="form-container4" onSubmit={this.submitForm}>
          <img
            src="https://assets.ccbp.in/frontend/react-js/nxt-trendz-logo-img.png"
            className="register-website-logo-desktop-image4"
            alt="website logo"
          />
          <div className="input-container4">{this.renderUsernameField()}</div>
          <div className="input-container4">{this.renderEmailField()}</div>
          <div className="input-container4">{this.renderPasswordField()}</div>
          <button type="submit" className="register-button4">
            Register
          </button>
          {showSubmitError && <p className="error-message4">*{errorMsg}</p>}
        </form>
      </div>
    );
  }
}

export default Register;
