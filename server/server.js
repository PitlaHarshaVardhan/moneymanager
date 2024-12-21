const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const cron = require("node-cron");
const path = require("path");
const { v4 } = require("uuid");

const app = express();
const port = 3001;
const currentDate = new Date().toLocaleDateString("en-CA");

// Enable CORS
app.use(cors());
app.use(express.json());

// Create MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "94409912@Harsha", // Replace with your MySQL password
  database: "mydb", // Replace with your database name
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err);
  } else {
    console.log("Connected to the MySQL database.");
  }
});

// Monthly Reset Task
cron.schedule("59 23 28-31 * *", () => {
  console.log("Cron job running at month's end...");
  const currentMonth = new Date().getMonth() + 1;
  const lastDay = new Date(new Date().getFullYear(), currentMonth, 0).getDate();

  if (new Date().getDate() === lastDay) {
    db.query(
      'SELECT SUM(amount) AS remaining FROM transaction WHERE type="Income"',
      (err, result) => {
        if (err) {
          return console.error("Error fetching income:", err.message);
        }
        const remainingIncome = result[0]?.remaining || 0;

        db.query(
          "INSERT INTO transaction (transactionid, title, amount, type, date) VALUES (?, ?, ?, ?, ?)",
          [
            v4(),
            "Previous Month Balance",
            remainingIncome,
            "Income",
            new Date().toISOString().split("T")[0],
          ],
          (insertErr) => {
            if (insertErr) {
              return console.error(
                "Error inserting new balance:",
                insertErr.message
              );
            }
            db.query(
              'DELETE FROM transaction WHERE type="Expenses"',
              (deleteErr) => {
                if (deleteErr) {
                  return console.error(
                    "Error resetting expenses:",
                    deleteErr.message
                  );
                }
                console.log("Monthly reset completed successfully!");
              }
            );
          }
        );
      }
    );
  }
});

// Generate PDF report for all transactions
app.get("/generate-pdf", (req, res) => {
  const outputDir = path.resolve(__dirname, "reports");
  const fileName = `Transaction_Report_${
    new Date().toISOString().split("T")[0]
  }.pdf`; // Creating a dynamic filename based on the current date

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true }); // Make sure the directory exists
  }

  db.query("SELECT * FROM transaction", (err, results) => {
    if (err) {
      return res.status(500).send("Failed to fetch transactions.");
    }

    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    // Create PDF document
    const pdfDoc = new PDFDocument();
    pdfDoc.pipe(fs.createWriteStream(fileName));
    pdfDoc.pipe(res); // Stream the PDF directly to the client as well

    // Add report title
    pdfDoc
      .fontSize(18)
      .text("All Transactions Report", { align: "center" })
      .moveDown(2);

    // Table headers
    const headers = ["Title", "Amount", "Type", "Date"];
    const cellPadding = 5;

    // Column widths (based on longest text to ensure a proper table layout)
    const columnWidths = [150, 100, 100, 100];

    // Draw the table header
    pdfDoc
      .fontSize(12)
      .text(headers[0], 50, pdfDoc.y)
      .text(headers[1], 50 + columnWidths[0], pdfDoc.y)
      .text(headers[2], 50 + columnWidths[0] + columnWidths[1], pdfDoc.y)
      .text(
        headers[3],
        50 + columnWidths[0] + columnWidths[1] + columnWidths[2],
        pdfDoc.y
      );

    pdfDoc.moveDown();
    pdfDoc
      .moveTo(50, pdfDoc.y)
      .lineTo(
        50 +
          columnWidths[0] +
          columnWidths[1] +
          columnWidths[2] +
          columnWidths[3],
        pdfDoc.y
      )
      .stroke();

    // Add rows for transactions
    results.forEach((transaction) => {
      pdfDoc
        .text(transaction.title, 50, pdfDoc.y)
        .text(transaction.amount, 50 + columnWidths[0], pdfDoc.y)
        .text(
          transaction.type,
          50 + columnWidths[0] + columnWidths[1],
          pdfDoc.y
        )
        .text(
          transaction.date,
          50 + columnWidths[0] + columnWidths[1] + columnWidths[2],
          pdfDoc.y
        );

      pdfDoc.moveDown(0.5);
      pdfDoc
        .moveTo(50, pdfDoc.y)
        .lineTo(
          50 +
            columnWidths[0] +
            columnWidths[1] +
            columnWidths[2] +
            columnWidths[3],
          pdfDoc.y
        )
        .stroke();
    });

    pdfDoc.end();

    pdfDoc.on("finish", () => {
      console.log(`PDF generated at ${fileName}`);
    });

    pdfDoc.on("error", (error) => {
      console.error("Error creating PDF:", error.message);
      res.status(500).send("Error generating PDF.");
    });
  });
});

// API to get all transactions
app.get("/transaction", (req, res) => {
  db.query("SELECT * FROM transaction", (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      console.log(err.message);
    } else {
      results.forEach((result, index) => {
        console.log(result.date);
        if (result.date != null) {
          const date = new Date(result.date); // Convert to a Date object
          date.setHours(date.getHours() + 5, date.getMinutes() + 30); // Add 5:30 for IST offset

          // Format as YYYY-MM-DD
          const formattedDate = date.toISOString().split("T")[0];
          result.date = formattedDate;
        }
      });

      res.json(results);
    }
  });
});

// API to create a transaction
app.post("/transaction", (req, res) => {
  const { transactionid, title, amount, type } = req.body;
  console.log(currentDate);
  const date = new Date(currentDate); // Convert to a Date object
  date.setHours(date.getHours() + 5, date.getMinutes() + 30); // Add 5:30 for IST offset

  // Format as YYYY-MM-DD
  const formattedDate = date.toISOString().split("T")[0];

  // console.log(formattedDate);

  db.query(
    "INSERT INTO transaction (transactionid, title, amount, type, date) VALUES (?, ?, ?, ?, ?)",
    [transactionid, title, amount, type, formattedDate],
    (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.status(201).json({ transactionid, title, amount, type });
      }
    }
  );
});

// API to delete a transaction
app.delete("/transaction/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM transaction WHERE transactionid = ?", [id], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(200).json({ message: `Transaction with ID ${id} deleted` });
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
