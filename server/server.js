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
const twilio = require("twilio");

const app = express();

// Use the PORT environment variable provided by Render, default to 3001 for local development
const port = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: "https://moneymanager-1-4fn4.onrender.com", // Replace with your actual deployed frontend URL
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// MongoDB Atlas Connection
const uri =
  process.env.MONGO_URI ||
  "mongodb+srv://sriramkomma2443:Lowda12345@mydb-cluster.46hwdk7.mongodb.net/?retryWrites=true&w=majority&appName=mydb-cluster";
const client = new MongoClient(uri);

let db;
let retryCount = 0;
const maxRetries = 5;
async function connectDB() {
  const maskedUri = uri.replace(/:([^@]+)@/, ":****@");
  console.log(
    `Attempting to connect to MongoDB with URI: ${maskedUri}, Retry ${
      retryCount + 1
    }/${maxRetries}`
  );
  try {
    await client.connect();
    db = client.db("mydb");
    console.log("Connected to MongoDB Atlas successfully.");
    retryCount = 0; // Reset retry count on success
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
    if (retryCount < maxRetries) {
      retryCount++;
      setTimeout(connectDB, 5000); // Retry after 5 seconds
    } else {
      console.error("Max retry attempts reached. Shutting down.");
      process.exit(1);
    }
  }
}
connectDB();

// Twilio Configuration (Use environment variables only)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.error(
    "Missing required environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER"
  );
  process.exit(1);
}

const twilioClient = new twilio(accountSid, authToken);

// Authentication Middleware
const verifyToken = (req, res, next) => {
  const token = req.cookies.jwt_token;
  if (!token) return res.status(401).json({ error: "Unauthorized, No Token" });

  jwt.verify(token, "first_project_fullstack", (err, decoded) => {
    if (err) {
      console.error("Token verification failed:", err.message);
      return res.status(401).json({ error: "Unauthorized, Invalid Token" });
    }
    req.user = decoded;
    next();
  });
};

// Basic root route for testing
app.get("/", (req, res) => {
  console.log("Received GET request to root route.");
  res.status(200).send("Server is running!");
});

// User Registration
app.post("/register", async (req, res) => {
  console.log("Register request received:", req.body);
  const { username, email, password, phone } = req.body;

  if (!username || !email || !password || !phone) {
    console.log("Validation failed: Missing fields");
    return res
      .status(400)
      .json({ error: "All fields are required including phone" });
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

    console.log("Inserting new user:", { username, email, phone });
    await usersCollection.insertOne({
      username,
      email,
      password: hashedPassword,
      phone,
    });
    console.log("User registered successfully");
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Registration error:", err.message);
    res.status(500).json({ error: `Registration failed: ${err.message}` });
  }
});

// User Login
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

    if (!user || !(await bcrypt.compare(password, user.password))) {
      console.log("User not found or invalid password:", email);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email, phone: user.phone },
      "first_project_fullstack",
      { expiresIn: "1h" }
    );

    res.cookie("jwt_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    console.log("Login successful for:", email);
    res.json({
      message: "Login successful",
      token,
      userId: user._id.toString(),
      phone: user.phone,
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

// User Logout
app.post("/logout", (req, res) => {
  res.clearCookie("jwt_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  console.log("Logout successful, cookie cleared");
  res.json({ message: "Logged out successfully" });
});

// Get Transactions
app.get("/transaction", verifyToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    console.log("Fetching transactions for user:", userId);
    const transactionsCollection = db.collection("transaction");
    const transactions = await transactionsCollection
      .find({ userId })
      .toArray();
    if (!transactions) transactions = [];
    console.log("Transactions fetched:", transactions.length);
    res.json(transactions);
  } catch (err) {
    console.error("Error fetching transactions:", err.message);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// Create Transaction
app.post("/transaction", verifyToken, async (req, res) => {
  console.log("Transaction request received:", req.body);
  const { title, amount, type } = req.body;
  const userId = req.user.userId;

  if (!title || !amount || !type) {
    console.log("Validation failed: Missing fields");
    return res.status(400).json({ error: "All fields are required" });
  }

  const transactionId = uuidv4();
  const currentDate = new Date().toISOString().split("T")[0];

  try {
    const transactionsCollection = db.collection("transaction");
    await transactionsCollection.insertOne({
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
    console.error("Error inserting transaction:", err.message);
    res.status(500).json({ error: "Database error" });
  }
});

// Delete Transaction
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
    const result = await transactionsCollection.deleteOne({
      transactionId: id,
      userId,
    });

    if (result.deletedCount === 0) {
      console.log("Transaction not found or unauthorized:", id);
      return res
        .status(404)
        .json({ error: "Transaction not found or unauthorized" });
    }

    console.log("Transaction deleted successfully:", id);
    res.status(200).json({ message: `Transaction with ID ${id} deleted` });
  } catch (err) {
    console.error("Error deleting transaction:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Clear Transactions
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
    console.error("Error clearing transactions:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update Transaction
app.put("/transaction/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { title, amount, type } = req.body;
  const userId = req.user.userId;

  if (!title || !amount || !type) {
    console.log("Validation failed: Missing fields");
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    console.log("Attempting to update transaction:", id, "for user:", userId);
    const transactionsCollection = db.collection("transaction");
    const result = await transactionsCollection.updateOne(
      { transactionId: id, userId },
      { $set: { title, amount: parseInt(amount), type } }
    );

    if (result.matchedCount === 0) {
      console.log("Transaction not found or unauthorized:", id);
      return res
        .status(404)
        .json({ error: "Transaction not found or unauthorized" });
    }

    console.log("Transaction updated successfully:", id);
    res.json({ message: "Transaction updated successfully" });
  } catch (err) {
    console.error("Error updating transaction:", err.message);
    res.status(500).json({ error: "Error updating transaction" });
  }
});

// QR Scan Payment
app.post("/scan-payment", verifyToken, async (req, res) => {
  const { qrData, amount, recipientPhone } = req.body; // Allow dynamic recipient phone
  const userId = req.user.userId;

  if (!qrData || !amount || !recipientPhone) {
    console.log("Validation failed: Missing qrData, amount, or recipientPhone");
    return res
      .status(400)
      .json({ error: "Missing qrData, amount, or recipientPhone" });
  }

  const parsedAmount = parseInt(amount, 10);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    console.log("Validation failed: Invalid amount");
    return res.status(400).json({ error: "Invalid amount provided" });
  }

  try {
    const urlParams = new URLSearchParams(qrData);
    const payeeName = urlParams.get("pn") || "Pitla Harsha Vardhan";
    const vpa = urlParams.get("pa") || "pitlavardhan@fifederal";
    const currency = urlParams.get("cu") || "INR";

    const transactionId = uuidv4();
    const currentDate = new Date().toISOString().split("T")[0];

    const transactionsCollection = db.collection("transaction");
    await transactionsCollection.insertOne({
      transactionId,
      title: "QR Payment",
      amount: parsedAmount,
      type: "Expense",
      date: currentDate,
      userId,
      status: "pending",
      recipientPhone,
      qrData,
    });

    const upiLink = `upi://pay?pa=${encodeURIComponent(
      vpa
    )}&pn=${encodeURIComponent(payeeName)}&am=${encodeURIComponent(
      parsedAmount.toFixed(2)
    )}&cu=${encodeURIComponent(currency)}`;
    const messageBody = `Payment Request: Pay ₹${parsedAmount} to ${payeeName}. Click here: ${upiLink} (Transaction ID: ${transactionId})`;

    const message = await twilioClient.messages.create({
      body: messageBody,
      from: twilioPhoneNumber,
      to: `+91${recipientPhone.replace(/^0/, "")}`, // Ensure proper phone format
    });

    console.log("Payment request sent via SMS:", message.sid);
    res.json({
      message: "Payment request sent successfully",
      transactionId,
      upiLink,
    });
  } catch (err) {
    console.error("Error processing QR payment:", err.message);
    if (err.code === 21211 || err.code === 21610) {
      return res.status(400).json({ error: `Twilio error: ${err.message}` });
    }
    res.status(500).json({ error: `Error processing payment: ${err.message}` });
  }
});

// Cron Job: Month-End Balance
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
      console.error("Cron job error:", err.message);
    }
  }
});

// Generate PDF Report
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
    console.error("Error generating PDF:", err.message);
    res.status(500).json({ error: "Failed to generate PDF" });
  }
});

// Start Server
async function startServer() {
  console.log("Starting server...");
  try {
    await connectDB(); // Wait for DB connection
    app.listen(port, "0.0.0.0", () => {
      console.log(`Server running on port ${port}`);
      console.log("Server is listening on all interfaces (0.0.0.0)");
    });
  } catch (err) {
    console.error("Error during server startup:", err.message);
    process.exit(1);
  }
}

startServer();
