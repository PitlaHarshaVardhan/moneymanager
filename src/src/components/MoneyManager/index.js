import { Component } from "react";
// import { useHistory } from "react-router-dom";
// import { v4 } from "uuid";
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
  {
    optionId: "INCOME",
    displayText: "Income",
  },
  {
    optionId: "EXPENSES",
    displayText: "Expenses",
  },
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
      this.qrScanner.destroy(); // Stop the QR scanner when the component is unmounted
    }
  }

  fetchTransactions = () => {
    axios
      .get("http://localhost:3001/transaction", { withCredentials: true })
      .then((response) => {
        this.setState({ transactionsList: response.data });
        console.log(response.data);
      })
      .catch((error) => {
        console.error("There was an error fetching the transactions!", error);
      });
  };

  // Initialize QR Scanner when it's activated
  initializeScanner = () => {
    const videoElem = document.getElementById("scanner-video");
    if (videoElem) {
      this.qrScanner = new QrScanner(
        videoElem,
        this.handleScan,
        this.handleError
      );
      this.qrScanner.start();
    } else {
      console.error("QR Scanner: video element not found");
    }
  };

  handleScan = (data, history) => {
    if (data) {
      alert("QR Code Scanned: " + data);
      history.push(`/payment/${data}`);
    }
  };

  handleError = (err) => {
    console.error("QR Scanner Error: ", err);
  };

  toggleScanner = () => {
    this.setState((prevState) => {
      const newScannerState = !prevState.isScannerActive;
      if (newScannerState) {
        this.initializeScanner();
      } else {
        this.qrScanner.stop();
      }
      return { isScannerActive: newScannerState };
    });
  };

  deleteTransaction = (transactionid) => {
    const { transactionsList } = this.state;
    axios
      .delete(`http://localhost:3001/transaction/${transactionid}`, {
        withCredentials: true,
      }) // Ensure credentials are included
      .then(() => {
        const updatedTransactionList = transactionsList.filter(
          (eachTransaction) => transactionid !== eachTransaction.transactionid
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
        this.setState({ transactionsList: [] }); // Clear transactions in the state
        console.log("All transactions cleared successfully");
      })
      .catch((error) => {
        console.error(
          "Error clearing transactions:",
          error.response?.data?.message || error.message
        );
      });
  };

  updateTransaction = (transactionid, updatedTransaction) => {
    axios
      .put(
        `http://localhost:3001/transaction/${transactionid}`,
        updatedTransaction,
        { withCredentials: true }
      )
      .then(() => {
        this.fetchTransactions(); // Refresh transactions after updating
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

    const userId = JSON.parse(localStorage.getItem("user")).userId;
    // Retrieve userId

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
        this.fetchTransactions(); // Refresh transactions after adding
        this.setState({
          titleInput: "",
          amountInput: "",
          optionId: transactionTypeOptions[0].optionId,
        });
      })
      .catch((error) => {
        console.error("There was an error adding the transaction!", error);
      });
  };

  onChangeOptionId = (event) => {
    this.setState({ optionId: event.target.value });
  };

  onChangeAmountInput = (event) => {
    this.setState({ amountInput: event.target.value });
  };

  onChangeTitleInput = (event) => {
    this.setState({ titleInput: event.target.value });
  };

  getExpenses = () => {
    const { transactionsList } = this.state;
    let expensesAmount = 0;
    transactionsList.forEach((eachTransaction) => {
      if (eachTransaction.type === transactionTypeOptions[1].displayText) {
        expensesAmount += eachTransaction.amount;
      }
    });
    return expensesAmount;
  };

  getIncome = () => {
    const { transactionsList } = this.state;
    let incomeAmount = 0;
    transactionsList.forEach((eachTransaction) => {
      if (eachTransaction.type === transactionTypeOptions[0].displayText) {
        incomeAmount += eachTransaction.amount;
      }
    });
    return incomeAmount;
  };

  getBalance = () => {
    const { transactionsList } = this.state;
    let balanceAmount = 0;
    let incomeAmount = 0;
    let expensesAmount = 0;

    transactionsList.forEach((eachTransaction) => {
      if (eachTransaction.type === transactionTypeOptions[0].displayText) {
        incomeAmount += eachTransaction.amount;
      } else {
        expensesAmount += eachTransaction.amount;
      }
    });

    balanceAmount = incomeAmount - expensesAmount;
    return balanceAmount;
  };

  logout = () => {
    axios
      .post("http://localhost:3001/logout", {}, { withCredentials: true }) // Ensure credentials are included
      .then(() => {
        Cookies.remove("jwt_token"); // Remove token from client-side
        window.location.href = "/login"; // Redirect to login page
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
      <div className="app-container1">
        <div className="responsive-container1">
          <div className="header-container1">
            <h1 className="heading">Hi, BACHELORS</h1>
            <p className="header-content">
              Welcome back to your
              <span className="money-manager-text"> Money Manager</span>
            </p>
          </div>
          <FaCloudDownloadAlt
            className="button5"
            onClick={() =>
              window.open("http://localhost:3001/generate-pdf", "_blank")
            }
          />
          {/* <button>Download Monthly Report</button> */}
          <MdDeleteForever
            className="button5"
            onClick={this.clearAllTransactions}
          />
          {/* <button >
            Clear All Transactions
          </button> */}
          <IoIosQrScanner className="button5" onClick={this.toggleScanner} />
          {/* <button>
            {isScannerActive ? "Close Scanner" : "Open QR Scanner"}
          </button> */}
          <IoIosLogOut className="button5" onClick={this.logout} />
          {/* <button>Logout</button> */}

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

            {/* QR Scanner */}
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
                      key={eachTransaction.transactionid}
                      transactionDetails={eachTransaction}
                      deleteTransaction={this.deleteTransaction}
                      updateTransaction={this.updateTransaction} // ✅ Pass it here
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
