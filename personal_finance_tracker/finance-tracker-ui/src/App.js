import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import LandingPage from "./pages/LandingPage.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import DashboardHome from "./pages/dashboard/DashboardHome.jsx";

// Income
import AddIncome from "./pages/income/AddIncome.jsx";
import ViewIncome from "./pages/income/ViewIncome.jsx";

// Expense
import AddExpense from "./pages/expense/AddExpense.jsx";
import ViewExpense from "./pages/expense/ViewExpense.jsx";

// Borrow
import AddBorrow from "./pages/borrow/AddBorrow.jsx";
import ViewBorrow from "./pages/borrow/ViewBorrow.jsx";

// Lend
import AddLend from "./pages/lend/AddLend.jsx";
import ViewLend from "./pages/lend/ViewLend.jsx";

// Repayment
import RepayBorrow from "./pages/repayment/RepayBorrow.jsx";
import ReceiveRepayment from "./pages/repayment/ReceiveRepayment.jsx";
import ViewRepayments from "./pages/repayment/ViewRepayments.jsx";

// Reports
import ViewReports from "./pages/reports/ViewReports.jsx";
import GenerateReport from "./pages/reports/GenerateReport.jsx";

// Notifications
import NotificationsPage from "./pages/notifications/NotificationsPage.jsx";

// Savings
import AddSavings from "./pages/savings/AddSavings.jsx";
import SpendSavings from "./pages/savings/SpendSavings.jsx";
import ViewSavings from "./pages/savings/ViewSavings.jsx";

function App() {
  return (
    <Router>
      <Routes>
        {/* Main */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<DashboardHome />} />

        {/* Income */}
        <Route path="/income/add" element={<AddIncome />} />
        <Route path="/income" element={<ViewIncome />} />

        {/* Expense */}
        <Route path="/expense/add" element={<AddExpense />} />
        <Route path="/expense" element={<ViewExpense />} />

        {/* Borrow */}
        <Route path="/borrow/add" element={<AddBorrow />} />
        <Route path="/borrow/view" element={<ViewBorrow />} />

        {/* Lend */}
        <Route path="/lend/add" element={<AddLend />} />
        <Route path="/lend/view" element={<ViewLend />} />

        {/* Repayment */}
        <Route path="/repayment/repay/:borrowId" element={<RepayBorrow />} />
        <Route path="/repayment/receive/:lendId" element={<ReceiveRepayment />} />
        <Route path="/repayment/view" element={<ViewRepayments />} />

        {/* Reports */}
        <Route path="/reports" element={<ViewReports />} />
        <Route path="/reports/generate" element={<GenerateReport />} />

        {/* Notifications */}
        <Route path="/notifications" element={<NotificationsPage />} />

        {/* Savings */}
        <Route path="/savings/addsavings" element={<AddSavings />} />
        <Route path="/savings/spendsavings" element={<SpendSavings />} />
        <Route path="/savings" element={<ViewSavings />} />
      </Routes>
    </Router>
  );
}

export default App;