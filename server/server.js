const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { v4: uuidv4 } = require("uuid");
const cron = require("node-cron");
const PDFDocument = require("pdfkit");
const fs = require("fs");

const app = express();
const port = 3001;

// Middleware
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(cookieParser());

// MongoDB Atlas Connection
const uri =
  "mongodb+srv://sriramkomma2443:Lowda12345@mydb-cluster.46hwdk7.mongodb.net/?retryWrites=true&w=majority&appName=mydb-cluster";
const client = new MongoClient(uri);

let db;
async function connectDB() {
  try {
    await client.connect();
    db = client.db("mydb");
    console.log("Connected to MongoDB Atlas.");
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  }
}
connectDB();

// Authentication Middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies.jwt_token;
  if (!token) return res.status(401).json({ error: "Unauthorized, No Token" });

  jwt.verify(token, "first_project_fullstack", (err, decoded) => {
    if (err) {
      console.error("Token verification failed:", err);
      return res.status(401).json({ error: "Unauthorized, Invalid Token" });
    }
    req.user = decoded;
    next();
  });
};

// **User Registration**
app.post("/register", async (req, res) => {
  console.log("Register request received:", req.body);
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    console.log("Validation failed: Missing fields");
    return res.status(400).json({ error: "All fields are required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log("Validation failed: Invalid email");
    return res.status(400).json({ error: "Please enter a valid email with @" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const usersCollection = db.collection("users");
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      console.log("User already exists:", email);
      return res.status(400).json({ error: "User already exists" });
    }

    console.log("Inserting new user:", { username, email });
    await usersCollection.insertOne({
      username,
      email,
      password: hashedPassword,
    });
    console.log("User registered successfully");
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: `Registration failed: ${err.message}` });
  }
});

// **User Login**
app.post("/login", async (req, res) => {
  console.log("Login request received:", req.body);
  const { email, password } = req.body;

  if (!email || !password) {
    console.log("Validation failed: Missing fields");
    return res.status(400).json({ error: "Email and password are required" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log("Validation failed: Invalid email");
    return res.status(400).json({ error: "Please enter a valid email with @" });
  }

  try {
    const usersCollection = db.collection("users");
    const user = await usersCollection.findOne({ email });

    if (!user) {
      console.log("User not found:", email);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log("Invalid password for:", email);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      "first_project_fullstack",
      { expiresIn: "1h" }
    );

    res.cookie("jwt_token", token, { httpOnly: true, secure: false });
    console.log("Login successful for:", email);
    res.json({
      message: "Login successful",
      token,
      userId: user._id.toString(),
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// **User Logout**
app.post("/logout", (req, res) => {
  res.cookie("jwt_token", "", {
    httpOnly: true,
    secure: false,
    expires: new Date(0),
  });
  res.json({ message: "Logged out successfully" });
});

// **Get Transactions**
app.get("/transaction", verifyToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    console.log("Fetching transactions for user:", userId);
    const transactionsCollection = db.collection("transaction");
    const transactions = await transactionsCollection
      .find({ userId })
      .toArray();
    res.json(transactions);
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({ error: err.message });
  }
});

// **Create Transaction**
app.post("/transaction", async (req, res) => {
  console.log("Transaction request received:", req.body);
  const { title, amount, type, userId } = req.body;

  if (!title || !amount || !type || !userId) {
    console.log("Validation failed: Missing fields");
    return res.status(400).json({ error: "All fields are required" });
  }

  const transactionId = uuidv4();
  const currentDate = new Date().toISOString().split("T")[0];

  try {
    const transactionsCollection = db.collection("transaction");
    const result = await transactionsCollection.insertOne({
      transactionId,
      title,
      amount: parseInt(amount),
      type,
      date: currentDate,
      userId,
    });
    console.log("Transaction inserted successfully:", transactionId);
    res.json({ message: "Transaction added successfully", transactionId });
  } catch (err) {
    console.error("Error inserting transaction:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// **Delete Transaction**
app.delete("/transaction/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.userId;

  if (!id) {
    console.log("Validation failed: Missing transaction ID");
    return res.status(400).json({ error: "Transaction ID is required" });
  }

  try {
    console.log("Attempting to delete transaction:", id, "for user:", userId);
    const transactionsCollection = db.collection("transaction");
    const transaction = await transactionsCollection.findOne({
      transactionId: id,
      userId,
    });
    if (!transaction) {
      console.log("Transaction not found in DB:", id, "for user:", userId);
      return res
        .status(404)
        .json({ error: "Transaction not found or unauthorized" });
    }

    const result = await transactionsCollection.deleteOne({
      transactionId: id,
      userId,
    });

    console.log("Delete result:", result);
    if (result.deletedCount === 0) {
      console.log("No transaction deleted:", id);
      return res
        .status(404)
        .json({ error: "Transaction not found or unauthorized" });
    }

    console.log("Transaction deleted successfully:", id);
    res.status(200).json({ message: `Transaction with ID ${id} deleted` });
  } catch (err) {
    console.error("Error deleting transaction:", err);
    res.status(500).json({ error: err.message });
  }
});

// **Clear Transactions**
app.delete("/transactions/clear", verifyToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    console.log("Clearing transactions for user:", userId);
    const transactionsCollection = db.collection("transaction");
    const result = await transactionsCollection.deleteMany({ userId });

    if (result.deletedCount === 0) {
      console.log("No transactions found to delete for user:", userId);
      return res.status(404).json({ error: "No transactions found to delete" });
    }

    console.log("All transactions cleared for user:", userId);
    res.status(200).json({ message: "All transactions cleared successfully" });
  } catch (err) {
    console.error("Error clearing transactions:", err);
    res.status(500).json({ error: err.message });
  }
});

// **Update Transaction**
app.put("/transaction/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { title, amount, type } = req.body;
  const userId = req.user.userId;

  if (!title || !amount || !type) {
    console.log("Validation failed: Missing fields", { title, amount, type });
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    console.log("Attempting to update transaction:", id, "for user:", userId);
    console.log("Update data:", { title, amount: parseInt(amount), type });
    const transactionsCollection = db.collection("transaction");
    const transaction = await transactionsCollection.findOne({
      transactionId: id,
      userId,
    });
    if (!transaction) {
      console.log("Transaction not found in DB:", id, "for user:", userId);
      return res
        .status(404)
        .json({ error: "Transaction not found or unauthorized" });
    }

    const result = await transactionsCollection.updateOne(
      { transactionId: id, userId },
      { $set: { title, amount: parseInt(amount), type } }
    );

    console.log("Update result:", result);
    if (result.matchedCount === 0) {
      console.log("No transaction matched for update:", id);
      return res
        .status(404)
        .json({ error: "Transaction not found or unauthorized" });
    }

    console.log("Transaction updated successfully:", id);
    res.json({ message: "Transaction updated successfully" });
  } catch (err) {
    console.error("Error updating transaction:", err);
    res.status(500).json({ error: "Error updating transaction" });
  }
});

// **Cron Job: Month-End Balance**
cron.schedule("59 23 28-31 * *", async () => {
  console.log("Cron job running at month's end...");
  const currentMonth = new Date().getMonth() + 1;
  const lastDay = new Date(new Date().getFullYear(), currentMonth, 0).getDate();

  if (new Date().getDate() === lastDay) {
    try {
      const usersCollection = db.collection("users");
      const transactionsCollection = db.collection("transaction");

      const users = await usersCollection.find().toArray();
      for (const user of users) {
        const userId = user._id.toString();

        const income = await transactionsCollection
          .aggregate([
            { $match: { userId, type: "Income" } },
            { $group: { _id: null, total: { $sum: "$amount" } } },
          ])
          .toArray();

        const remainingIncome = income[0]?.total || 0;

        await transactionsCollection.insertOne({
          transactionId: uuidv4(),
          title: "Previous Month Balance",
          amount: remainingIncome,
          type: "Income",
          date: new Date().toISOString().split("T")[0],
          userId,
        });

        await transactionsCollection.deleteMany({ userId, type: "Expenses" });
        console.log(`Monthly reset completed successfully for user ${userId}`);
      }
    } catch (err) {
      console.error("Cron job error:", err);
    }
  }
});

// **Generate PDF Report**
app.get("/generate-pdf", verifyToken, async (req, res) => {
  const userId = req.user.userId;
  const fileName = `Transaction_Report_${
    new Date().toISOString().split("T")[0]
  }.pdf`;

  try {
    const transactionsCollection = db.collection("transaction");
    const transactions = await transactionsCollection
      .find({ userId })
      .toArray();

    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.setHeader("Content-Type", "application/pdf");

    const pdfDoc = new PDFDocument({ margin: 30, size: "A4" });
    pdfDoc.pipe(fs.createWriteStream(fileName));
    pdfDoc.pipe(res);

    pdfDoc
      .fontSize(18)
      .text("Your Transactions Report", { align: "center", underline: true })
      .moveDown(2);

    const headers = ["Date", "Title", "Amount (Rp)", "Type"];
    const columnWidths = [150, 150, 150, 100];
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
    pdfDoc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
    pdfDoc.moveDown(0.5);

    transactions.forEach((transaction) => {
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
    console.log("PDF generated successfully for user:", userId);
  } catch (err) {
    console.error("Error generating PDF:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// **Start Server**
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
