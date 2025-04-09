import { Component } from "react";
import { FaEdit, FaTrash, FaSave, FaTimes } from "react-icons/fa";
import "./index.css";

class TransactionItem extends Component {
  state = {
    isEditing: false,
    title: this.props.transactionDetails.title,
    amount: this.props.transactionDetails.amount,
    type: this.props.transactionDetails.type,
  };

  toggleEdit = () => {
    this.setState((prevState) => ({
      isEditing: !prevState.isEditing,
      title: this.props.transactionDetails.title,
      amount: this.props.transactionDetails.amount,
      type: this.props.transactionDetails.type,
    }));
  };

  onChangeTitle = (event) => this.setState({ title: event.target.value });
  onChangeAmount = (event) => this.setState({ amount: event.target.value });
  onChangeType = (event) => this.setState({ type: event.target.value });

  saveTransaction = () => {
    const { transactionDetails, updateTransaction } = this.props;
    const { title, amount, type } = this.state;

    const updatedTransaction = {
      title,
      amount: parseInt(amount),
      type,
    };

    console.log("Saving transaction:", updatedTransaction);
    updateTransaction(transactionDetails.transactionId, updatedTransaction);
    this.setState({ isEditing: false });
  };

  deleteTransaction = () => {
    const { transactionDetails, deleteTransaction } = this.props;
    console.log(
      "Deleting transaction with ID:",
      transactionDetails.transactionId
    );
    deleteTransaction(transactionDetails.transactionId);
  };

  render() {
    const { transactionDetails, isNightMode } = this.props;
    const { isEditing, title, amount, type } = this.state;

    return (
      <li className={`transaction-item ${isNightMode ? "night-mode" : ""}`}>
        {isEditing ? (
          <>
            <input
              type="text"
              value={title}
              onChange={this.onChangeTitle}
              className="edit-field"
            />
            <input
              type="number"
              value={amount}
              onChange={this.onChangeAmount}
              className="edit-field"
            />
            <select
              value={type}
              onChange={this.onChangeType}
              className="edit-field">
              <option value="Income">Income</option>
              <option value="Expenses">Expenses</option>
            </select>
            <span>
              {new Date(transactionDetails.date).toLocaleDateString()}
            </span>
            <div>
              <FaSave className="save-btn" onClick={this.saveTransaction} />
              <FaTimes className="cancel-btn" onClick={this.toggleEdit} />
            </div>
          </>
        ) : (
          <>
            <span>{transactionDetails.title}</span>
            <span>{transactionDetails.amount}</span>
            <span>{transactionDetails.type}</span>
            <span>
              {new Date(transactionDetails.date).toLocaleDateString()}
            </span>
            <div>
              <FaEdit className="edit-btn" onClick={this.toggleEdit} />
              <FaTrash
                className="delete-btn"
                onClick={this.deleteTransaction}
              />
            </div>
          </>
        )}
      </li>
    );
  }
}

export default TransactionItem;
