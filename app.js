require("dotenv").config();

const express = require("express");
const mysql = require("mysql2");
const path = require("path");

const app = express();
const PORT = process.env.PORT ||3000;

// MySQL Database Connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "gym_management",
    dateStrings: true
});

db.connect((err) => {
    if (err) {
        console.error("MySQL connection failed:", err.message);
        return;
    }

    console.log("MySQL Connected Successfully!");
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// ================= DASHBOARD =================

app.get("/api/dashboard", (req, res) => {
    const sql = `
        SELECT
        (SELECT COUNT(*) FROM members) AS totalMembers,
        (SELECT COUNT(*) FROM membership_plans) AS totalPlans,
        (SELECT COUNT(*) FROM subscriptions) AS totalSubscriptions
    `;

    db.query(sql, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json(rows[0]);
    });
});

// ================= MEMBERS =================

// Get all members
app.get("/api/members", (req, res) => {
    db.query(
        "SELECT * FROM members ORDER BY member_id DESC",
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json(rows);
        }
    );
});

// Add member
app.post("/api/members", (req, res) => {
    const { name, email, phone, join_date, status } = req.body;

    if (!name || !email || !phone || !join_date || !status) {
        return res.status(400).json({
            error: "Please fill all member fields."
        });
    }

    const sql = `
        INSERT INTO members
        (name, email, phone, join_date, status)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [name, email, phone, join_date, status],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({
                message: "Member added successfully",
                id: result.insertId
            });
        }
    );
});

// Update member
app.put("/api/members/:id", (req, res) => {
    const { name, email, phone, join_date, status } = req.body;

    const sql = `
        UPDATE members
        SET name=?, email=?, phone=?, join_date=?, status=?
        WHERE member_id=?
    `;

    db.query(
        sql,
        [name, email, phone, join_date, status, req.params.id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: "Member not found."
                });
            }

            res.json({ message: "Member updated successfully" });
        }
    );
});

// Delete member and related subscriptions
app.delete("/api/members/:id", (req, res) => {
    db.query(
        "DELETE FROM subscriptions WHERE member_id=?",
        [req.params.id],
        (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            db.query(
                "DELETE FROM members WHERE member_id=?",
                [req.params.id],
                (deleteErr, result) => {
                    if (deleteErr) {
                        return res.status(500).json({
                            error: deleteErr.message
                        });
                    }

                    if (result.affectedRows === 0) {
                        return res.status(404).json({
                            error: "Member not found."
                        });
                    }

                    res.json({
                        message: "Member and subscriptions deleted successfully"
                    });
                }
            );
        }
    );
});

// ================= MEMBERSHIP PLANS =================

// Get all membership plans
app.get("/api/plans", (req, res) => {
    const sql = `
        SELECT plan_id, plan_name, duration_months, fee, description
        FROM membership_plans
        ORDER BY plan_id DESC
    `;

    db.query(sql, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json(rows);
    });
});

// Add membership plan
app.post("/api/plans", (req, res) => {
    const {
        plan_name,
        duration_months,
        fee,
        description
    } = req.body;

    if (
        !plan_name ||
        !duration_months ||
        fee === undefined ||
        fee === null ||
        fee === ""
    ) {
        return res.status(400).json({
            error: "Please fill plan name, duration and fee."
        });
    }

    const sql = `
        INSERT INTO membership_plans
        (plan_name, duration_months, fee, description)
        VALUES (?, ?, ?, ?)
    `;

    db.query(
        sql,
        [plan_name, duration_months, fee, description || ""],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({
                message: "Membership plan added successfully",
                id: result.insertId
            });
        }
    );
});

// Delete membership plan
app.delete("/api/plans/:id", (req, res) => {
    const planId = req.params.id;

    db.query(
        "SELECT COUNT(*) AS total FROM subscriptions WHERE plan_id=?",
        [planId],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (rows[0].total > 0) {
                return res.status(400).json({
                    error: "This plan is used in subscriptions. Delete its subscriptions first."
                });
            }

            db.query(
                "DELETE FROM membership_plans WHERE plan_id=?",
                [planId],
                (deleteErr, result) => {
                    if (deleteErr) {
                        return res.status(500).json({
                            error: deleteErr.message
                        });
                    }

                    if (result.affectedRows === 0) {
                        return res.status(404).json({
                            error: "Membership plan not found."
                        });
                    }

                    res.json({
                        message: "Membership plan deleted successfully"
                    });
                }
            );
        }
    );
});

// ================= SUBSCRIPTIONS =================

// Get all subscriptions
app.get("/api/subscriptions", (req, res) => {
    const sql = `
        SELECT
            s.subscription_id,
            s.member_id,
            s.plan_id,
            m.name AS member_name,
            p.plan_name,
            p.fee,
            s.start_date,
            s.end_date,
            s.payment_status
        FROM subscriptions s
        JOIN members m ON s.member_id = m.member_id
        JOIN membership_plans p ON s.plan_id = p.plan_id
        ORDER BY s.subscription_id DESC
    `;

    db.query(sql, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json(rows);
    });
});

// Add subscription
app.post("/api/subscriptions", (req, res) => {
    const {
        member_id,
        plan_id,
        start_date,
        end_date,
        payment_status
    } = req.body;

    if (
        !member_id ||
        !plan_id ||
        !start_date ||
        !end_date ||
        !payment_status
    ) {
        return res.status(400).json({
            error: "Please fill all subscription fields."
        });
    }

    const sql = `
        INSERT INTO subscriptions
        (member_id, plan_id, start_date, end_date, payment_status)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [member_id, plan_id, start_date, end_date, payment_status],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({
                message: "Subscription created successfully",
                id: result.insertId
            });
        }
    );
});

// Delete subscription
app.delete("/api/subscriptions/:id", (req, res) => {
    db.query(
        "DELETE FROM subscriptions WHERE subscription_id=?",
        [req.params.id],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    error: "Subscription not found."
                });
            }

            res.json({
                message: "Subscription deleted successfully"
            });
        }
    );
});

// ================= START SERVER =================

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
