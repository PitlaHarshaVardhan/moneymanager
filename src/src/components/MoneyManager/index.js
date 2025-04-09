import { Component } from "react";
import { IoIosQrScanner } from "react-icons/io";
import { MdDeleteForever } from "react-icons/md";
import { IoIosLogOut } from "react-icons/io";
import { FaCloudDownloadAlt } from "react-icons/fa";
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
      .then((response) => {
        this.setState({ transactionsList: response.data });
      })
      .catch((error) => {
        console.error("Error fetching transactions:", error);
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

  handleScan = (result) => {
    if (result.data) {
      alert("QR Code Scanned: " + result.data);
      this.props.history?.push(`/payment/${result.data}`);
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

<<<<<<< HEAD
  toggleNightMode = () => {
    this.setState((prevState) => ({ isNightMode: !prevState.isNightMode }));
  };

=======
>>>>>>> b0d1ca8f52edf84e96223076c42407086a24f45a
  deleteTransaction = (transactionId) => {
    const { transactionsList } = this.state;
    axios
      .delete(`http://localhost:3001/transaction/${transactionId}`, {
        withCredentials: true,
      })
<<<<<<< HEAD
      .then((response) => {
        console.log("Delete response:", response.data);
=======
      .then(() => {
>>>>>>> b0d1ca8f52edf84e96223076c42407086a24f45a
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
      });
  };

  clearAllTransactions = () => {
    axios
      .delete("http://localhost:3001/transactions/clear", {
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
      });
  };

  updateTransaction = (transactionId, updatedTransaction) => {
<<<<<<< HEAD
    console.log(
      "Updating transaction with ID:",
      transactionId,
      "Data:",
      updatedTransaction
    );
=======
>>>>>>> b0d1ca8f52edf84e96223076c42407086a24f45a
    axios
      .put(
        `http://localhost:3001/transaction/${transactionId}`,
        updatedTransaction,
        {
          withCredentials: true,
        }
      )
      .then(() => {
        this.fetchTransactions();
      })
      .catch((error) => {
        console.error("Error updating transaction:", error);
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
      return;
    }

    axios
      .post(
        "http://localhost:3001/transaction",
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
      .post("http://localhost:3001/logout", {}, { withCredentials: true })
      .then(() => {
        Cookies.remove("jwt_token");
        window.location.href = "/login";
      })
      .catch((error) => {
        console.error("Logout failed", error);
      });
  };

  render() {
    const {
      titleInput,
      amountInput,
      optionId,
      transactionsList,
      isScannerActive,
    } = this.state;
    const balanceAmount = this.getBalance();
    const incomeAmount = this.getIncome();
    const expensesAmount = this.getExpenses();

    return (
<<<<<<< HEAD
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
              Welcome back to your{" "}
              <span className="money-manager-text">Money Manager</span>
=======
      <div className="app MDA-containers">
        <div className="responsive-container1">
          <div className="header-container1">
            <h1 className="heading">Hi, BACHELORS</h1>
            <p className="header-content">
              Welcome back to your
              <span className="money-manager-text"> Money Manager</span>
>>>>>>> b0d1ca8f52edf84e96223076c42407086a24f45a
            </p>
          </div>
          <FaCloudDownloadAlt
            className="button5"
            onClick={() =>
              window.open("http://localhost:3001/generate-pdf", "_blank")
            }
          />
          <MdDeleteForever
            className="button5"
            onClick={this.clearAllTransactions}
          />
          <IoIosQrScanner className="button5" onClick={this.toggleScanner} />
          <IoIosLogOut className="button5" onClick={this.logout} />

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
                onChange={this.onChangeOptionId}
              >
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
<<<<<<< HEAD
                      key={transaction.transactionId}
                      transactionDetails={transaction}
=======
                      key={eachTransaction.transactionId}
                      transactionDetails={eachTransaction}
>>>>>>> b0d1ca8f52edf84e96223076c42407086a24f45a
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

export default MoneyManager;
