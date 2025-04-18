import { Component } from "react";
import { IoIosQrScanner } from "react-icons/io";
import { MdDeleteForever } from "react-icons/md";
import { IoIosLogOut } from "react-icons/io";
import { FaCloudDownloadAlt } from "react-icons/fa";
import { FaMoon, FaSun } from "react-icons/fa";
import { withRouter } from "react-router-dom";
import Cookies from "js-cookie";
import axios from "axios";
import QrScanner from "qr-scanner";
import TransactionItem from "../TransactionItem";
import MoneyDetails from "../MoneyDetails";
import "./index.css";

const transactionTypeOptions = [
  { optionId: "INCOME", displayText: "Income" },
  { optionId: "EXPENSES", displayText: "Expenses" },
];

QrScanner.WORKER_PATH =
  process.env.PUBLIC_URL + "/qr-scanner/qr-scanner-worker.min.js";

class MoneyManager extends Component {
  state = {
    transactionsList: [],
    titleInput: "",
    amountInput: "",
    optionId: transactionTypeOptions[0].optionId,
    isScannerActive: false,
    scannerData: null,
    isNightMode: false,
    isLoading: false,
  };

  componentDidMount() {
    console.log("MoneyManager mounted, checking token...");
    const token = Cookies.get("jwt_token");
    console.log("Token found:", !!token);
    if (!token) {
      console.log("No token, redirecting to login");
      this.props.history.push("/login");
      return;
    }
    console.log("Fetching transactions...");
    this.fetchTransactions();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.isScannerActive && !prevState.isScannerActive) {
      this.initializeScanner();
    }
  }

  componentWillUnmount() {
    if (this.qrScanner) {
      this.qrScanner.destroy();
    }
  }

  fetchTransactions = () => {
    this.setState({ isLoading: true });
    axios
      .get(`${process.env.REACT_APP_API_URL}/transaction`, {
        withCredentials: true,
      })
      .then((response) => {
        this.setState({ transactionsList: response.data, isLoading: false });
      })
      .catch((error) => {
        console.error("Error fetching transactions:", error);
        this.setState({ isLoading: false });
        if (error.response?.status === 401) {
          Cookies.remove("jwt_token");
          localStorage.removeItem("user");
          this.props.history.push("/login");
          alert("Session expired. Please log in again.");
        } else {
          alert("Failed to fetch transactions. Please try again.");
        }
      });
  };

  initializeScanner = () => {
    const videoElem = document.getElementById("scanner-video");
    if (videoElem) {
      this.qrScanner = new QrScanner(videoElem, this.handleScan, {
        onDecodeError: this.handleError,
      });
      this.qrScanner.start();
    } else {
      console.error("QR Scanner: video element not found");
    }
  };

  handleScan = async (result) => {
    if (result.data) {
      console.log("Scanned QR Code Data:", result.data);
      const amount = prompt("Enter payment amount in INR:");
      if (!amount || isNaN(amount)) {
        alert("Please enter a valid amount");
        return;
      }

      const token = Cookies.get("jwt_token");
      if (!token) {
        console.error("No token available for scan");
        alert("Please log in to proceed.");
        this.props.history.push("/login");
        return;
      }

      try {
        const response = await fetch(
          "https://moneymanager-1-4fn4.onrender.com/scan-payment",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
            body: JSON.stringify({
              qrData: result.data,
              amount: parseInt(amount),
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log("Payment request sent:", data);
          this.setState({ upiLink: data.upiLink });
          this.fetchTransactions();
          alert("Payment request processed successfully!");
        } else {
          const errorData = await response.json();
          console.error("Failed to send payment request:", errorData);
          alert(`Failed to process payment: ${errorData.error}`);
        }
      } catch (error) {
        console.error("Error sending payment request:", error);
        alert(`Error processing payment: ${error.message}`);
      }
    }
  };

  handleError = (err) => {
    console.error("QR Scanner Error: ", err);
  };

  toggleScanner = () => {
    this.setState((prevState) => {
      const newScannerState = !prevState.isScannerActive;
      if (!newScannerState && this.qrScanner) {
        this.qrScanner.stop();
      }
      return { isScannerActive: newScannerState };
    });
  };

  toggleNightMode = () => {
    this.setState((prevState) => ({ isNightMode: !prevState.isNightMode }));
  };

  deleteTransaction = (transactionId) => {
    const { transactionsList } = this.state;
    axios
      .delete(`${process.env.REACT_APP_API_URL}/transaction/${transactionId}`, {
        withCredentials: true,
      })
      .then(() => {
        const updatedTransactionList = transactionsList.filter(
          (eachTransaction) => eachTransaction.transactionId !== transactionId
        );
        this.setState({ transactionsList: updatedTransactionList });
      })
      .catch((error) => {
        console.error(
          "Error deleting transaction:",
          error.response?.data?.message || error.message
        );
        if (error.response?.status === 401) {
          Cookies.remove("jwt_token");
          localStorage.removeItem("user");
          this.props.history.push("/login");
          alert("Session expired. Please log in again.");
        } else {
          alert("Failed to delete transaction. Please try again.");
        }
      });
  };

  clearAllTransactions = () => {
    axios
      .delete(`${process.env.REACT_APP_API_URL}/transactions/clear`, {
        withCredentials: true,
      })
      .then(() => {
        this.setState({ transactionsList: [] });
      })
      .catch((error) => {
        console.error(
          "Error clearing transactions:",
          error.response?.data?.message || error.message
        );
        if (error.response?.status === 401) {
          Cookies.remove("jwt_token");
          localStorage.removeItem("user");
          this.props.history.push("/login");
          alert("Session expired. Please log in again.");
        } else {
          alert("Failed to clear transactions. Please try again.");
        }
      });
  };

  updateTransaction = (transactionId, updatedTransaction) => {
    axios
      .put(
        `${process.env.REACT_APP_API_URL}/transaction/${transactionId}`,
        updatedTransaction,
        { withCredentials: true }
      )
      .then(() => {
        this.fetchTransactions();
      })
      .catch((error) => {
        console.error("Error updating transaction:", error);
        if (error.response?.status === 401) {
          Cookies.remove("jwt_token");
          localStorage.removeItem("user");
          this.props.history.push("/login");
          alert("Session expired. Please log in again.");
        } else {
          alert("Failed to update transaction. Please try again.");
        }
      });
  };

  onAddTransaction = (event) => {
    event.preventDefault();
    const { titleInput, amountInput, optionId } = this.state;
    const typeOption = transactionTypeOptions.find(
      (eachTransaction) => eachTransaction.optionId === optionId
    );
    const { displayText } = typeOption;
    const userId = JSON.parse(localStorage.getItem("user"))?.userId;

    if (!userId) {
      console.error("User ID not found! Ensure the user is logged in.");
      alert("Please log in to add a transaction.");
      this.props.history.push("/login");
      return;
    }

    axios
      .post(
        `${process.env.REACT_APP_API_URL}/transaction`,
        {
          title: titleInput,
          amount: parseInt(amountInput),
          type: displayText,
          userId: userId,
        },
        { withCredentials: true }
      )
      .then(() => {
        this.fetchTransactions();
        this.setState({
          titleInput: "",
          amountInput: "",
          optionId: transactionTypeOptions[0].optionId,
        });
      })
      .catch((error) => {
        console.error("Error adding transaction:", error);
        if (error.response?.status === 401) {
          Cookies.remove("jwt_token");
          localStorage.removeItem("user");
          this.props.history.push("/login");
          alert("Session expired. Please log in again.");
        } else {
          alert("Failed to add transaction. Please try again.");
        }
      });
  };

  onChangeOptionId = (event) => this.setState({ optionId: event.target.value });
  onChangeAmountInput = (event) =>
    this.setState({ amountInput: event.target.value });
  onChangeTitleInput = (event) =>
    this.setState({ titleInput: event.target.value });

  getExpenses = () => {
    return this.state.transactionsList.reduce((total, transaction) => {
      return transaction.type === transactionTypeOptions[1].displayText
        ? total + transaction.amount
        : total;
    }, 0);
  };

  getIncome = () => {
    return this.state.transactionsList.reduce((total, transaction) => {
      return transaction.type === transactionTypeOptions[0].displayText
        ? total + transaction.amount
        : total;
    }, 0);
  };

  getBalance = () => this.getIncome() - this.getExpenses();

  logout = () => {
    axios
      .post(
        `${process.env.REACT_APP_API_URL}/logout`,
        {},
        { withCredentials: true }
      )
      .then(() => {
        Cookies.remove("jwt_token");
        localStorage.removeItem("user");
        this.props.history.push("/login");
      })
      .catch((error) => {
        console.error("Logout failed", error);
        alert("Logout failed. Please try again.");
      });
  };

  render() {
    const {
      titleInput,
      amountInput,
      optionId,
      transactionsList,
      isScannerActive,
      isNightMode,
      isLoading,
    } = this.state;
    const balanceAmount = this.getBalance();
    const incomeAmount = this.getIncome();
    const expensesAmount = this.getExpenses();

    return (
      <div
        className={`money-manager-container ${
          isNightMode ? "night-mode" : ""
        }`}>
        {isLoading ? (
          <div className="loading">Loading transactions...</div>
        ) : (
          <div className="money-manager-card">
            <div className="header-section">
              <div className="logo-container">
                <img
                  src="https://cdn-icons-png.flaticon.com/512/2995/2995353.png"
                  className="logo-image"
                  alt="money manager logo"
                />
                <h1 className="app-title">Money Manager</h1>
              </div>
              <div className="action-buttons">
                <FaCloudDownloadAlt
                  className="icon-btn"
                  onClick={() =>
                    window.open(
                      `${process.env.REACT_APP_API_URL}/generate-pdf`,
                      "_blank"
                    )
                  }
                  title="Download Report"
                />
                <MdDeleteForever
                  className="icon-btn"
                  onClick={this.clearAllTransactions}
                  title="Clear All"
                />
                <IoIosQrScanner
                  className="icon-btn"
                  onClick={this.toggleScanner}
                  title={isScannerActive ? "Close Scanner" : "Open Scanner"}
                />
                <IoIosLogOut
                  className="icon-btn"
                  onClick={this.logout}
                  title="Logout"
                />
                {isNightMode ? (
                  <FaSun
                    className="icon-btn"
                    onClick={this.toggleNightMode}
                    title="Switch to Light Mode"
                  />
                ) : (
                  <FaMoon
                    className="icon-btn"
                    onClick={this.toggleNightMode}
                    title="Switch to Night Mode"
                  />
                )}
              </div>
            </div>

            <div className="welcome-text">
              <h2 className="greeting">Hi, Bachelors!</h2>
              <p className="welcome-subtext">
                Welcome back to your{" "}
                <span className="money-manager-text">Money Manager</span>
              </p>
            </div>

            <MoneyDetails
              balanceAmount={balanceAmount}
              incomeAmount={incomeAmount}
              expensesAmount={expensesAmount}
            />
            <div className="transaction-details">
              <form
                className="transaction-form"
                onSubmit={this.onAddTransaction}>
                <h1 className="transaction-header">Add Transaction</h1>
                <label className="input-label" htmlFor="title">
                  TITLE
                </label>
                <input
                  type="text"
                  id="title"
                  value={titleInput}
                  onChange={this.onChangeTitleInput}
                  className="input"
                  placeholder="TITLE"
                />
                <label className="input-label" htmlFor="amount">
                  AMOUNT
                </label>
                <input
                  type="text"
                  id="amount"
                  className="input"
                  value={amountInput}
                  onChange={this.onChangeAmountInput}
                  placeholder="AMOUNT"
                />
                <label className="input-label" htmlFor="select">
                  TYPE
                </label>
                <select
                  id="select"
                  className="input"
                  value={optionId}
                  onChange={this.onChangeOptionId}>
                  {transactionTypeOptions.map((eachOption) => (
                    <option
                      key={eachOption.optionId}
                      value={eachOption.optionId}>
                      {eachOption.displayText}
                    </option>
                  ))}
                </select>
                <button type="submit" className="buttons">
                  Add
                </button>
              </form>

              {isScannerActive && (
                <div className="scanner-container">
                  <video id="scanner-video" className="scanner" />
                </div>
              )}

              <div className="history-transactions">
                <h1 className="transaction-header">History</h1>
                <div className="transactions-table-container">
                  <ul className="transactions-table">
                    <li className="table-header">
                      <p className="table-header-cell">Title</p>
                      <p className="table-header-cell">Amount</p>
                      <p className="table-header-cell">Type</p>
                      <p className="table-header-cell">Date</p>
                    </li>
                    {transactionsList.map((eachTransaction) => (
                      <TransactionItem
                        key={eachTransaction.transactionId}
                        transactionDetails={eachTransaction}
                        deleteTransaction={this.deleteTransaction}
                        updateTransaction={this.updateTransaction}
                      />
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default withRouter(MoneyManager);
