import { Component } from "react";
import { v4 } from "uuid";
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
      .get("https://moneymanager-r7y8.onrender.com/transaction")
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

  handleScan = (data) => {
    if (data) {
      this.setState({ scannerData: data });
      alert("QR Code Scanned: " + data);
      // Redirect to payment page with the receiver details
      window.location.href = `/payment/${data}`;
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

  deleteTransaction = (id) => {
    const { transactionsList } = this.state;
    axios
      .delete(`https://moneymanager-r7y8.onrender.com/transaction/${id}`)
      .then(() => {
        const updatedTransactionList = transactionsList.filter(
          (eachTransaction) => id !== eachTransaction.id
        );
        this.setState({ transactionsList: updatedTransactionList });
      })
      .catch((error) => {
        console.error("There was an error deleting the transaction!", error);
      });
  };

  onAddTransaction = (event) => {
    event.preventDefault();
    const { titleInput, amountInput, optionId } = this.state;
    const typeOption = transactionTypeOptions.find(
      (eachTransaction) => eachTransaction.optionId === optionId
    );
    const { displayText } = typeOption;
    const newTransaction = {
      transactionid: v4(),
      title: titleInput,
      amount: parseInt(amountInput),
      type: displayText,
    };

    axios
      .post(
        "https://moneymanager-r7y8.onrender.com/transaction",
        newTransaction
      )
      .then(() => {
        this.setState((prevState) => ({
          transactionsList: [...prevState.transactionsList, newTransaction],
          titleInput: "",
          amountInput: "",
          optionId: transactionTypeOptions[0].optionId,
        }));
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
      <div className="app-container">
        <div className="responsive-container">
          <div className="header-container">
            <h1 className="heading">Hi, BACHELORS</h1>
            <p className="header-content">
              Welcome back to your
              <span className="money-manager-text"> Money Manager</span>
            </p>
          </div>
          <button
            className="button"
            onClick={() =>
              window.open(
                "https://moneymanager-r7y8.onrender.com/generate-pdf",
                "_blank"
              )
            }
          >
            Download Monthly Report
          </button>

          <button className="button" onClick={this.toggleScanner}>
            {isScannerActive ? "Close Scanner" : "Open QR Scanner"}
          </button>

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
              <button type="submit" className="button">
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
