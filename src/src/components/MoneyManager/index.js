import { Component } from "react";
import { IoIosQrScanner } from "react-icons/io";
import { MdDeleteForever } from "react-icons/md";
import { IoIosLogOut } from "react-icons/io";
import { FaCloudDownloadAlt, FaSun, FaMoon } from "react-icons/fa";
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
    isNightMode: false,
    transactionStatus: null,
  };

  componentDidMount() {
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
    axios
      .get("http://localhost:3001/transaction", { withCredentials: true })
      .then((response) => this.setState({ transactionsList: response.data }))
      .catch((error) => console.error("Error fetching transactions:", error));
  };

  initializeScanner = () => {
    const videoElem = document.getElementById("scanner-video");
    if (videoElem) {
      this.qrScanner = new QrScanner(
        videoElem,
        this.handleScan,
        this.handleError
      );
      this.qrScanner.start();
    }
  };

  handleScan = (data) => {
    if (data) {
      this.qrScanner.stop();
      this.setState({ isScannerActive: false });

      let amount = null;
      if (data.startsWith("upi://")) {
        const urlParams = new URLSearchParams(data.split("?")[1]);
        amount = urlParams.get("am") || null;
      } else if (data.includes("amount=")) {
        amount = data.split("amount=")[1];
      }

      if (amount && !isNaN(amount)) {
        this.processPayment(parseInt(amount));
      } else {
        this.setState({
          transactionStatus: "Invalid QR Code: No amount found",
        });
      }
    }
  };

  handleError = (err) => {
    console.error("QR Scanner Error: ", err);
    this.setState({ transactionStatus: "Scan Failed: Please try again" });
  };

  processPayment = (amount) => {
    const upiId = "7093085723@ybl";
    const userId = JSON.parse(localStorage.getItem("user"))?.userId;

    if (!userId) {
      this.setState({ transactionStatus: "Error: User not logged in" });
      return;
    }

    const upiIntent = `upi://pay?pa=${upiId}&pn=Payee&am=${amount}&cu=INR`;
    window.location.href = upiIntent;

    setTimeout(() => {
      this.setState({ transactionStatus: "Transaction Success" });
      this.addExpenseAfterPayment(amount, userId);
    }, 2000);
  };

  addExpenseAfterPayment = (amount, userId) => {
    const expense = {
      title: "UPI Payment",
      amount: amount,
      type: "Expenses",
      userId: userId,
      date: new Date().toISOString(),
    };

    axios
      .post("http://localhost:3001/transaction", expense, {
        withCredentials: true,
      })
      .then(() => {
        this.fetchTransactions();
        setTimeout(() => this.setState({ transactionStatus: null }), 3000);
      })
      .catch((error) => {
        console.error("Error adding expense:", error);
        this.setState({ transactionStatus: "Error adding to expenses" });
      });
  };

  toggleScanner = () => {
    this.setState((prevState) => {
      const newScannerState = !prevState.isScannerActive;
      if (!newScannerState && this.qrScanner) this.qrScanner.stop();
      return { isScannerActive: newScannerState, transactionStatus: null };
    });
  };

  toggleNightMode = () => {
    this.setState((prevState) => ({ isNightMode: !prevState.isNightMode }));
  };

  deleteTransaction = (transactionId) => {
    axios
      .delete(`http://localhost:3001/transaction/${transactionId}`, {
        withCredentials: true,
      })
      .then((response) => {
        console.log("Delete response:", response.data);
        this.setState((prevState) => ({
          transactionsList: prevState.transactionsList.filter(
            (t) => t.transactionId !== transactionId
          ),
        }));
      })
      .catch((error) => {
        console.error(
          "Error deleting transaction:",
          error.response?.data || error
        );
      });
  };

  clearAllTransactions = () => {
    axios
      .delete("http://localhost:3001/transactions/clear", {
        withCredentials: true,
      })
      .then(() => this.setState({ transactionsList: [] }))
      .catch((error) => console.error("Error clearing transactions:", error));
  };

  updateTransaction = (transactionId, updatedTransaction) => {
    console.log(
      "Updating transaction with ID:",
      transactionId,
      "Data:",
      updatedTransaction
    );
    axios
      .put(
        `http://localhost:3001/transaction/${transactionId}`,
        updatedTransaction,
        { withCredentials: true }
      )
      .then((response) => {
        console.log("Update response:", response.data);
        this.fetchTransactions();
      })
      .catch((error) => {
        console.error(
          "Error updating transaction:",
          error.response?.data || error
        );
      });
  };

  onAddTransaction = (event) => {
    event.preventDefault();
    const { titleInput, amountInput, optionId } = this.state;
    const typeOption = transactionTypeOptions.find(
      (opt) => opt.optionId === optionId
    );
    const userId = JSON.parse(localStorage.getItem("user"))?.userId;

    if (!userId) return console.error("User ID not found!");

    axios
      .post(
        "http://localhost:3001/transaction",
        {
          title: titleInput,
          amount: parseInt(amountInput),
          type: typeOption.displayText,
          userId,
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
      .catch((error) => console.error("Error adding transaction:", error));
  };

  onChangeOptionId = (event) => this.setState({ optionId: event.target.value });
  onChangeAmountInput = (event) =>
    this.setState({ amountInput: event.target.value });
  onChangeTitleInput = (event) =>
    this.setState({ titleInput: event.target.value });

  getExpenses = () => {
    return this.state.transactionsList.reduce(
      (sum, t) => (t.type === "Expenses" ? sum + t.amount : sum),
      0
    );
  };

  getIncome = () => {
    return this.state.transactionsList.reduce(
      (sum, t) => (t.type === "Income" ? sum + t.amount : sum),
      0
    );
  };

  getBalance = () => this.getIncome() - this.getExpenses();

  logout = () => {
    axios
      .post("http://localhost:3001/logout", {}, { withCredentials: true })
      .then(() => {
        Cookies.remove("jwt_token");
        window.location.href = "/login";
      })
      .catch((error) => console.error("Logout failed:", error));
  };

  render() {
    const {
      titleInput,
      amountInput,
      optionId,
      transactionsList,
      isScannerActive,
      isNightMode,
      transactionStatus,
    } = this.state;
    const balanceAmount = this.getBalance();
    const incomeAmount = this.getIncome();
    const expensesAmount = this.getExpenses();

    return (
      <div
        className={`money-manager-container ${
          isNightMode ? "night-mode" : ""
        }`}>
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
                  window.open("http://localhost:3001/generate-pdf", "_blank")
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
              Welcome back to your financial hub
            </p>
          </div>

          <MoneyDetails
            balanceAmount={balanceAmount}
            incomeAmount={incomeAmount}
            expensesAmount={expensesAmount}
            isNightMode={isNightMode}
          />

          <div className="main-content">
            <form className="transaction-form" onSubmit={this.onAddTransaction}>
              <h2 className="section-title">Add Transaction</h2>
              <div className="input-group">
                <label className="input-label" htmlFor="title">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={titleInput}
                  onChange={this.onChangeTitleInput}
                  className="input-field"
                  placeholder="Enter title"
                />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="amount">
                  Amount
                </label>
                <input
                  type="number"
                  id="amount"
                  value={amountInput}
                  onChange={this.onChangeAmountInput}
                  className="input-field"
                  placeholder="Enter amount"
                />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="type">
                  Type
                </label>
                <select
                  id="type"
                  className="input-field"
                  value={optionId}
                  onChange={this.onChangeOptionId}>
                  {transactionTypeOptions.map((opt) => (
                    <option key={opt.optionId} value={opt.optionId}>
                      {opt.displayText}
                    </option>
                  ))}
                </select>
              </div>
              <button type="submit" className="add-btn">
                Add Transaction
              </button>
            </form>

            {isScannerActive && (
              <div className="scanner-container">
                <video id="scanner-video" className="scanner-video" />
              </div>
            )}

            {transactionStatus && (
              <div className="transaction-status">
                <p>{transactionStatus}</p>
              </div>
            )}

            <div className="history-section">
              <h2 className="section-title">Transaction History</h2>
              <div className="transactions-scroll-container">
                <ul className="transactions-list">
                  <li className="table-header">
                    <span>Title</span>
                    <span>Amount</span>
                    <span>Type</span>
                    <span>Date</span>
                    <span>Actions</span>
                  </li>
                  {transactionsList.map((transaction) => (
                    <TransactionItem
                      key={transaction.transactionId}
                      transactionDetails={transaction}
                      deleteTransaction={this.deleteTransaction}
                      updateTransaction={this.updateTransaction}
                      isNightMode={isNightMode}
                    />
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default MoneyManager;
