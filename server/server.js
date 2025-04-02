const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { v4: uuidv4 } = require("uuid");
const cron = require("node-cron");
const PDFDocument = require("pdfkit");
const fs = require("fs");

const path = require("path");
const app = express();
const port = 3001;

// Middleware
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(cookieParser());

// MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "94409912@Harsha",
  database: "mydb",
});

db.connect((err) => {
  if (err) console.error("Database connection error:", err);
  else console.log("Connected to MySQL database.");
});

// Authentication Middleware
const verifyToken = (req, res, next) => {
  console.log("Checking JWT token:", req.cookies); // Debugging
  const token = req.cookies.jwt_token;
  if (!token)
    return res.status(401).json({ message: "Unauthorized, No Token" });

  jwt.verify(token, "first_project_fullstack", (err, decoded) => {
    if (err)
      return res.status(401).json({ message: "Unauthorized, Invalid Token" });

    req.user = decoded;
    next();
  });
};

// **User Registration**
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length > 0)
      return res.status(400).json({ error: "User already exists" });

    db.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashedPassword],
      (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ message: "User registered successfully" });
      }
    );
  });
});

// **User Login**
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) {
        return res.status(500).json({ message: "Server error" });
      }

      if (results.length === 0) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const user = results[0];
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        "first_project_fullstack",
        { expiresIn: "1h" }
      );

      res.cookie("jwt_token", token, { httpOnly: true, secure: false });
      res.json({ message: "Login successful", token, userId: user.id });
    }
  );
});
// **User Logout**
app.post("/logout", (req, res) => {
  res.cookie("jwt_token", "", {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    expires: new Date(0), // Expire the cookie immediately
  });
  res.json({ message: "Logged out successfully" });
});

// **Get Transactions for Logged-in User**
app.get("/transaction", verifyToken, (req, res) => {
  const userId = req.user.userId;

  db.query(
    "SELECT * FROM transaction WHERE userId = ?",
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json(results);
    }
  );
});

// **Create a New Transaction**
app.post("/transaction", (req, res) => {
  const { title, amount, type, userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  const transactionId = uuidv4(); // Generate unique transaction ID
  const currentDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

  const sql =
    "INSERT INTO transaction (transactionid, title, amount, type, date, userId) VALUES (?, ?, ?, ?, ?, ?)";
  db.query(
    sql,
    [transactionId, title, amount, type, currentDate, userId],
    (err, result) => {
      if (err) {
        console.error("Error inserting transaction:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json({ message: "Transaction added successfully!" });
    }
  );
});

// **Delete a Transaction**
app.delete("/transaction/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId; // Ensure userId is extracted correctly

  if (!id) {
    return res.status(400).json({ message: "Transaction ID is required" });
  }

  db.query(
    "DELETE FROM transaction WHERE transactionid = ? AND userId = ?",
    [id, userId],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "Transaction not found or unauthorized" });
      }

      res.status(200).json({ message: `Transaction with ID ${id} deleted` });
    }
  );
});

// **Clear All Transactions for Logged-in User**
app.delete("/transactions/clear", verifyToken, (req, res) => {
  const userId = req.user.userId;

  db.query(
    "DELETE FROM transaction WHERE userId = ?",
    [userId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "No transactions found to delete" });
      }

      res
        .status(200)
        .json({ message: "All transactions cleared successfully" });
    }
  );
});

// **Cron Job: Month-End Balance Carry-Over**
cron.schedule("59 23 28-31 * *", () => {
  console.log("Cron job running at month's end...");

  const currentMonth = new Date().getMonth() + 1;
  const lastDay = new Date(new Date().getFullYear(), currentMonth, 0).getDate();

  if (new Date().getDate() === lastDay) {
    db.query("SELECT id FROM users", (err, users) => {
      if (err) return console.error("Error fetching users:", err.message);

      users.forEach((user) => {
        const userId = user.id;
        db.query(
          'SELECT SUM(amount) AS remaining FROM transaction WHERE type="Income" AND userId = ?',
          [userId],
          (err, result) => {
            if (err)
              return console.error("Error fetching income:", err.message);

            const remainingIncome = result[0]?.remaining || 0;

            db.query(
              "INSERT INTO transaction (transactionid, title, amount, type, date, userId) VALUES (?, ?, ?, ?, ?, ?)",
              [
                uuidv4(),
                "Previous Month Balance",
                remainingIncome,
                "Income",
                new Date().toISOString().split("T")[0],
                userId,
              ],
              (insertErr) => {
                if (insertErr)
                  return console.error(
                    "Error inserting new balance:",
                    insertErr.message
                  );

                db.query(
                  'DELETE FROM transaction WHERE type="Expenses" AND userId = ?',
                  [userId],
                  (deleteErr) => {
                    if (deleteErr)
                      return console.error(
                        "Error resetting expenses:",
                        deleteErr.message
                      );
                    console.log(
                      `Monthly reset completed successfully for user ${userId}`
                    );
                  }
                );
              }
            );
          }
        );
      });
    });
  }
});

// **Generate PDF Report**
app.get("/generate-pdf", verifyToken, (req, res) => {
  const userId = req.user.userId; // Get userId from JWT token
  const fileName = `Transaction_Report_${
    new Date().toISOString().split("T")[0]
  }.pdf`;

  db.query(
    "SELECT * FROM transaction WHERE userId = ?",
    [userId],
    (err, results) => {
      if (err) return res.status(500).send("Failed to fetch transactions.");

      res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
      res.setHeader("Content-Type", "application/pdf");

      const pdfDoc = new PDFDocument({ margin: 30, size: "A4" });
      pdfDoc.pipe(fs.createWriteStream(fileName));
      pdfDoc.pipe(res);

      // Title
      pdfDoc
        .fontSize(18)
        .text("Your Transactions Report", { align: "center", underline: true })
        .moveDown(2);

      // Table Header
      const headers = ["Date", "Title", "Amount (Rp)", "Type"];
      const columnWidths = [150, 150, 150, 100]; // Widths for each column
      let yPosition = pdfDoc.y;

      headers.forEach((header, i) => {
        pdfDoc
          .font("Helvetica-Bold")
          .fontSize(10)
          .text(
            header,
            50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0),
            yPosition
          );
      });

      pdfDoc.moveDown(0.5);
      yPosition = pdfDoc.y;

      // Draw a line under the header
      pdfDoc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
      pdfDoc.moveDown(0.5);

      // Table Rows
      results.forEach((transaction) => {
        yPosition = pdfDoc.y;
        const rowData = [
          new Date(transaction.date).toLocaleDateString(),
          transaction.title,
          transaction.amount,
          transaction.type,
        ];

        rowData.forEach((data, i) => {
          pdfDoc
            .font("Helvetica")
            .fontSize(10)
            .text(
              String(data),
              50 + columnWidths.slice(0, i).reduce((a, b) => a + b, 0),
              yPosition
            );
        });

        pdfDoc.moveDown(0.5);
      });

      pdfDoc.end();
    }
  );
});

app.put("/transaction/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  const { title, amount, type } = req.body;
  const userId = req.user.userId;

  db.query(
    "UPDATE transaction SET title = ?, amount = ?, type = ? WHERE transactionid = ? AND userId = ?",
    [title, amount, type, id, userId],
    (err, result) => {
      if (err)
        return res.status(500).json({ message: "Error updating transaction." });
      if (result.affectedRows === 0)
        return res.status(404).json({ message: "Transaction not found." });
      res.json({ message: "Transaction updated successfully." });
    }
  );
});

// **Start Server**
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
