GYM MEMBERSHIP MANAGEMENT SYSTEM
================================

Technology:
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- Database: MySQL (mysql2)

IMPORTANT: This project expects the database and three tables you created in MySQL Workbench:
gym_management
  members(member_id, name, email, phone, join_date, status)
  membership_plans(plan_id, plan_name, duration_months, fee, description)
  subscriptions(subscription_id, member_id, plan_id, start_date, end_date, payment_status)

SETUP IN VS CODE
----------------
1. Extract the ZIP file.
2. Open the extracted "Gym-Membership-Management" folder in VS Code.
3. Open app.js.
4. Find password: "YOUR_MYSQL_PASSWORD"
5. Replace it with your own MySQL root password. Keep the quotation marks.
   Example: password: "your_actual_password"
6. Open Terminal > New Terminal.
7. Run:
      npm install
8. Run:
      npm start
9. Open this address in your browser:
      http://localhost:3000

FEATURES
--------
- Dashboard with total members, plans and subscriptions
- Add, view, edit and delete members
- Add and view membership plans
- Create, view and delete subscriptions
- MySQL database connection

NOTES
-----
- Do not upload your real database password to GitHub.
- Make sure MySQL Server is running before starting the app.
- The app uses the existing gym_management database. It does not create or erase your database.
- If your MySQL table/column names differ, the SQL queries in app.js must be adjusted.
