import { Component } from "react";
import { IoIosQrScanner } from "react-icons/io";
import { MdDeleteForever } from "react-icons/md";
import { IoIosLogOut } from "react-icons/io";
import { FaCloudDownloadAlt } from "react-icons/fa";
import { FaMoon, FaSun } from "react-icons/fa";
import { withRouter } from "react-router-dom";
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
    console.log(
      "Fetching transactions from:",
      `${process.env.REACT_APP_API_URL}/transaction`
    );
    axios
      .get(`${process.env.REACT_APP_API_URL}/transaction`, {
        withCredentials: true,
      })
      .then((response) => {
        console.log("Transactions fetched:", response.data);
        this.setState({ transactionsList: response.data });
      })
      .catch((error) => {
        console.error(
          "Fetch transactions error:",
          error.response?.data || error.message
        );
        alert("Failed to fetch transactions. Please try again.");
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
      const recipientPhone = prompt("Enter recipient phone number:");
      if (!amount || isNaN(amount) || !recipientPhone) {
        alert("Please enter a valid amount and recipient phone number");
        return;
      }

      try {
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}/scan-payment`,
          { qrData: result.data, amount: parseInt(amount), recipientPhone },
          { withCredentials: true }
        );
        console.log("Payment request sent:", response.data);
        this.fetchTransactions();
        alert("Payment request processed successfully!");
      } catch (error) {
        console.error(
          "Error sending payment request:",
          error.response?.data || error.message
        );
        alert(
          `Error processing payment: ${
            error.response?.data?.error || error.message
          }`
        );
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
          "Delete transaction error:",
          error.response?.data || error.message
        );
        alert("Failed to delete transaction. Please try again.");
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
          "Clear transactions error:",
          error.response?.data || error.message
        );
        alert("Failed to clear transactions. Please try again.");
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
        console.error(
          "Update transaction error:",
          error.response?.data || error.message
        );
        alert("Failed to update transaction. Please try again.");
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
      console.error("User ID not found! Please log in.");
      alert("Please log in to add a transaction.");
      return;
    }

    axios
      .post(
        `${process.env.REACT_APP_API_URL}/transaction`,
        { title: titleInput, amount: parseInt(amountInput), type: displayText },
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
        console.error(
          "Add transaction error:",
          error.response?.data || error.message
        );
        alert("Failed to add transaction. Please try again.");
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
        localStorage.removeItem("user");
        this.props.history.push("/login");
      })
      .catch((error) => {
        console.error("Logout error:", error.response?.data || error.message);
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
                onClick={() => {
                  window.open(
                    `${process.env.REACT_APP_API_URL}/generate-pdf`,
                    "_blank"
                  );
                }}
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
            <form className="transaction-form" onSubmit={this.onAddTransaction}>
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
                  <option key={eachOption.optionId} value={eachOption.optionId}>
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
      </div>
    );
  }
}

export default withRouter(MoneyManager);
