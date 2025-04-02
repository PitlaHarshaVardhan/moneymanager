import { useState } from "react";
import "./index.css";

const TransactionItem = ({
  transactionDetails,
  deleteTransaction,
  updateTransaction,
}) => {
  const { transactionid, title, amount, type, date } = transactionDetails;
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [editedAmount, setEditedAmount] = useState(amount);
  const [editedType, setEditedType] = useState(type);

  const onDeleteTransaction = () => {
    deleteTransaction(transactionid);
  };

  const onEditTransaction = () => {
    setIsEditing(true);
  };

  const onSaveTransaction = () => {
    updateTransaction(transactionid, {
      title: editedTitle,
      amount: editedAmount,
      type: editedType,
    });
    setIsEditing(false);
  };

  const onCancelEdit = () => {
    setIsEditing(false);
    setEditedTitle(title);
    setEditedAmount(amount);
    setEditedType(type);
  };

  return (
    <li className="table-row">
      {isEditing ? (
        <>
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            className="edit-input"
          />
          <input
            type="number"
            value={editedAmount}
            onChange={(e) => setEditedAmount(e.target.value)}
            className="edit-input"
          />
          <input
            type="text"
            value={editedType}
            onChange={(e) => setEditedType(e.target.value)}
            className="edit-input"
          />
          <button className="save-button" onClick={onSaveTransaction}>
            Save
          </button>
          <button className="cancel-button" onClick={onCancelEdit}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <p className="transaction-text">{title}</p>
          <p className="transaction-text">Rs {amount}</p>
          <p className="transaction-text">{type}</p>
          <p className="transaction-text">{date}</p>
          <div className="button-container">
            <button className="edit-button" onClick={onEditTransaction}>
              Edit
            </button>
            <button
              className="delete-button"
              type="button"
              onClick={onDeleteTransaction}
              data-testid="delete"
            >
              <img
                className="delete-img"
                src="https://assets.ccbp.in/frontend/react-js/money-manager/delete.png"
                alt="delete"
              />
            </button>
          </div>
        </>
      )}
    </li>
  );
};

export default TransactionItem;
