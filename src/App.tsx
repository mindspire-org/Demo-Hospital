import { Route, Routes } from 'react-router-dom'
import ErrorBoundary from './components/ui/ErrorBoundary'
import Home from './pages/Home'
import Hospital_Login from './pages/hospital/hospital_Login'
import Hospital_Layout from './pages/hospital/hospital_Layout'
import Hospital_IPDDashboard from './pages/hospital/hospital_ipddashboard'
import Hospital_SidebarPermissions from './pages/hospital/hospital_SidebarPermissions'
import Hospital_BedManagement from './pages/hospital/hospital_BedManagement'
import Hospital_TokenGenerator from './pages/hospital/hospital_TokenGenerator'
import Hospital_TodayTokens from './pages/hospital/hospital_TodayTokens'
import Hospital_TokenHistory from './pages/hospital/hospital_TokenHistory'
import Hospital_MyActivityReport from './pages/hospital/hospital_MyActivityReport'
import Hospital_EmergencyQueue from './pages/hospital/hospital_EmergencyQueue'
import Hospital_EmergencyChart from './pages/hospital/hospital_EmergencyChart'
import Hospital_ERBillingAdd from './pages/hospital/hospital_ERBillingAdd'
import Hospital_EmergencyServices from './pages/hospital/hospital_EmergencyServices'
import Hospital_EmergencyServiceAdd from './pages/hospital/hospital_EmergencyServiceAdd'
import Hospital_Departments from './pages/hospital/hospital_Departments'
import Hospital_SearchPatients from './pages/hospital/hospital_SearchPatients'
import Hospital_UserManagement from './pages/hospital/hospital_UserManagement'
import Hospital_AuditLogs from './pages/hospital/hospital_AuditLogs'
import Hospital_Settings from './pages/hospital/hospital_Settings'
import Hospital_Backup from './pages/hospital/hospital_Backup'
import Hospital_Doctors from './pages/hospital/hospital_Doctors' 
import Hospital_PatientList from './pages/hospital/hospital_PatientList.tsx'
import Hospital_PatientProfile from './pages/hospital/hospital_PatientProfile.tsx'
import Hospital_DischargeWizard from './pages/hospital/hospital_DischargeWizard.tsx'
import Hospital_Discharged from './pages/hospital/hospital_Discharged.tsx'
import Hospital_ERDischarged from './pages/hospital/hospital_ERDischarged.tsx'
import Hospital_StaffAttendance from './pages/hospital/hospital_StaffAttendance.tsx'
import Hospital_StaffManagement from './pages/hospital/hospital_StaffManagement.tsx'
import Hospital_StaffSettings from './pages/hospital/hospital_StaffSettings.tsx'
import Hospital_StaffMonthly from './pages/hospital/hospital_StaffMonthly.tsx'
import Hospital_StaffDashboard from './pages/hospital/hospital_StaffDashboard.tsx'
import Hospital_Dashboard from './pages/hospital/hospital_Dashboard.tsx'
import Hospital_DoctorFinance from './pages/hospital/hospital_DoctorFinance.tsx'
import Hospital_IpdPrintReport from './pages/hospital/hospital_IpdPrintReport.tsx'
import Hospital_IPDReferrals from './pages/hospital/hospital_IPDReferrals.tsx'
import Hospital_ERReferrals from './pages/hospital/hospital_ERReferrals.tsx'
import Hospital_IPDServices from './pages/hospital/hospital_IPDServices.tsx'
import Hospital_IPDServiceAdd from './pages/hospital/hospital_IPDServiceAdd.tsx'
import Hospital_DoctorSchedules from './pages/hospital/hospital_DoctorSchedules'
import Hospital_Appointments from './pages/hospital/hospital_Appointments'
import { EquipmentDashboard, EquipmentList, EquipmentSuppliers, EquipmentPurchases, SupplierLedger, EquipmentDetail } from './features/hospital'
import Hospital_ConsentFormList from './pages/hospital/forms/Hospital_ConsentFormList.tsx'
import Hospital_ReceivedDeathList from './pages/hospital/forms/Hospital_ReceivedDeathList.tsx'
import Hospital_DeathCertificateList from './pages/hospital/forms/Hospital_DeathCertificateList.tsx'
import Hospital_BirthCertificateList from './pages/hospital/forms/Hospital_BirthCertificateList.tsx'
import Hospital_ShortStayList from './pages/hospital/forms/Hospital_ShortStayList.tsx'
import Hospital_DischargeSummaryList from './pages/hospital/forms/Hospital_DischargeSummaryList.tsx'
import Hospital_ReceivedDeathDetail from './pages/hospital/forms/Hospital_ReceivedDeathDetail.tsx'
import Hospital_DeathCertificateDetail from './pages/hospital/forms/Hospital_DeathCertificateDetail.tsx'
import Hospital_BirthCertificateDetail from './pages/hospital/forms/Hospital_BirthCertificateDetail.tsx'
import Hospital_ShortStayDetail from './pages/hospital/forms/Hospital_ShortStayDetail.tsx'
import Hospital_DischargeSummaryDetail from './pages/hospital/forms/Hospital_DischargeSummaryDetail.tsx'
import Hospital_InvoiceList from './pages/hospital/forms/Hospital_InvoiceList.tsx'
import IpdInvoiceSlip from './components/hospital/hospital_IpdInvoiceslip'
import Hospital_IpdBillingAdd from './pages/hospital/hospital_IpdBillingAdd'
import Hospital_CorporateDashboard from './pages/hospital/corporate/hospital_CorporateDashboard'
import Hospital_CorporateCompanies from './pages/hospital/corporate/hospital_CorporateCompanies'
import Hospital_CorporateRateRules from './pages/hospital/corporate/hospital_CorporateRateRules'
import Hospital_CorporateTransactions from './pages/hospital/corporate/hospital_CorporateTransactions'
import Hospital_CorporateClaims from './pages/hospital/corporate/hospital_CorporateClaims'
import Hospital_CorporatePayments from './pages/hospital/corporate/hospital_CorporatePayments'
import Hospital_CorporateReports from './pages/hospital/corporate/hospital_CorporateReports'
import Store_Dashboard from './pages/hospital/store_Dashboard'
import Store_Suppliers from './pages/hospital/store_Suppliers'
import Store_PurchaseList from './pages/hospital/store_PurchaseHistory'
import Store_AddPurchase from './pages/hospital/store_AddPurchase'
import Store_Inventory from './pages/hospital/store_Inventory'
import Store_IssueHistory from './pages/hospital/store_IssueHistory'
import Store_PurchaseOrders from './pages/hospital/store_PurchaseOrders'
import Store_Reports from './pages/hospital/store_Reports'
import Ambulance_Dashboard from './pages/hospital/ambulance_Dashboard'
import Ambulance_Master from './pages/hospital/ambulance_Master'
import Ambulance_Trips from './pages/hospital/ambulance_Trips'
import Ambulance_Fuel from './pages/hospital/ambulance_Fuel'
import Ambulance_Expenses from './pages/hospital/ambulance_Expenses'
import Ambulance_Reports from './pages/hospital/ambulance_Reports'
import Hospital_FbrDashboard from './pages/hospital/fbr/Hospital_FbrDashboard'
import Hospital_FbrSettings from './pages/hospital/fbr/Hospital_FbrSettings'
import Hospital_FbrLogs from './pages/hospital/fbr/Hospital_FbrLogs'
import Hospital_FbrReports from './pages/hospital/fbr/Hospital_FbrReports'
import Hospital_FbrCredentials from './pages/hospital/fbr/Hospital_FbrCredentials'
import Doctor_Layout from './pages/doctor/doctor_Layout'
import Doctor_Dashboard from './pages/doctor/doctor_Dashboard'
import Doctor_Patients from './pages/doctor/doctor_Patients'
import Doctor_Prescription from './pages/doctor/doctor_Prescription'
import Doctor_PrescriptionHistory from './pages/doctor/doctor_PrescriptionHistory'
import Doctor_PrescriptionTemplates from './pages/doctor/doctor_PrescriptionTemplates'
import Doctor_Notifications from './pages/doctor/doctor_Notifications'
import Doctor_Reports from './pages/doctor/doctor_Reports_new'
import Doctor_Referrals from './pages/doctor/doctor_Referrals'
import Doctor_Settings from './pages/doctor/doctor_Settings'
import Lab_Login from './pages/lab/lab_Login'
import Lab_Layout from './pages/lab/lab_Layout'
import Lab_Dashboard from './pages/lab/lab_Dashboard'
import Lab_Tests from './pages/lab/lab_Tests'
import Lab_Orders from './pages/lab/lab_SampleIntake'
import Lab_Tracking from './pages/lab/lab_Tracking'
import Lab_Appointments from './pages/lab/lab_Appointments'
import Lab_Results from './pages/lab/lab_Results'
import Lab_Barcodes from './pages/lab/lab_Barcodes'
import Lab_ReportApproval from './pages/lab/lab_ReportApproval'
import Lab_ReportGenerator from './pages/lab/lab_ReportGenerator'
import Lab_Settings from './pages/lab/lab_Settings'
import Lab_CriticalValues from './pages/lab/lab_CriticalValues'
import Lab_TotalTests from './pages/lab/lab_TotalTests'
import Lab_TestPackages from './pages/lab/lab_TestPackages'
import Lab_OutsourceLabs from './pages/lab/lab_OutsourceLabs'
import Lab_OutsourceRateList from './pages/lab/lab_OutsourceRateList'
import Lab_OutsourceDispatch from './pages/lab/lab_OutsourceDispatch'
import Lab_CenterRateList from './pages/lab/lab_CenterRateList'
import Lab_PatientCards from './pages/lab/lab_PatientCards'
import Lab_WardImports from './pages/lab/lab_WardImports'
import Lab_DailyWorksheet from './pages/lab/lab_DailyWorksheet'
import Lab_MainRegister from './pages/lab/lab_MainRegister'
import Lab_TAT from './pages/lab/lab_TAT'
import Lab_IncomeLedger from './pages/lab/lab_IncomeLedger'
import Lab_Inventory from './pages/lab/lab_Inventory'
import Lab_AddInvoicePage from './components/lab/lab_AddInvoicePage'
import Lab_Suppliers from './pages/lab/lab_Suppliers.tsx'
import Lab_Companies from './pages/lab/lab_Companies'
import Lab_SupplierReturns from './pages/lab/lab_SupplierReturns.tsx'
import Lab_PurchaseHistory from './pages/lab/lab_PurchaseHistory.tsx'
import Lab_PurchaseOrders from './pages/lab/lab_PurchaseOrders.tsx'
import Lab_ReturnHistory from './pages/lab/lab_ReturnHistory.tsx'
import Lab_UserManagement from './pages/lab/lab_UserManagement'
import Lab_SidebarPermissions from './pages/lab/lab_SidebarPermissions'
import Lab_Expenses from './pages/lab/lab_Expenses'
import Lab_AuditLogs from './pages/lab/lab_AuditLogs'
import Lab_Reports from './pages/lab/lab_Reports' 
import Lab_StaffAttendance from './pages/lab/lab_StaffAttendance'
import Lab_StaffManagement from './pages/lab/lab_StaffManagement'
import Lab_StaffSettings from './pages/lab/lab_StaffSettings'
import Lab_StaffMonthly from './pages/lab/lab_StaffMonthly'
import Lab_Referrals from './pages/lab/lab_Referrals'
import Lab_PayInOut from './pages/lab/lab_PayInOut'
import Lab_ManagerCashCount from './pages/lab/lab_ManagerCashCount'
import Lab_BB_Donors from './pages/lab/bloodbank/Lab_BB_Donors'
import Lab_BB_Inventory from './pages/lab/bloodbank/Lab_BB_Inventory'
import Lab_BB_Receivers from './pages/lab/bloodbank/Lab_BB_Receivers'
import Lab_TodaysTokens from './pages/lab/lab_TodaysTokens'
import Lab_CollectionCenters from './pages/lab/lab_CollectionCenters'
import Lab_CollectionCenterRevenue from './pages/lab/lab_CollectionCenterRevenue'
import Lab_CollectionCenterPayments from './pages/lab/lab_CollectionCenterPayments'
// Removed BB Labels and Settings pages (deleted)
import Finance_Transactions from './pages/hospital/hospital_Transactions.tsx'
import Finance_ExpenseHistory from './pages/hospital/hospital_ExpenseHistory.tsx'
import Finance_Login from './pages/finance/finance_Login.tsx'
import Finance_Layout from './pages/finance/finance_Layout.tsx'
import Finance_UserManagement from './pages/finance/finance_UserManagement'
import Finance_SidebarPermissions from './pages/finance/finance_SidebarPermissions'
import Finance_AuditLogs from './pages/finance/finance_AuditLogs'
import Finance_AccountLedger from './pages/finance/finance_AccountLedger'
import Finance_CashHandover from './pages/finance/finance_CashHandover'
import Finance_PendingHandovers from './pages/finance/finance_PendingHandovers'
import Finance_UserAccounts from './pages/finance/finance_UserAccounts'
// ERP pages (new)
import Finance_Dashboard from './pages/finance/finance_Dashboard'
import Finance_ChartOfAccounts2 from './pages/finance/finance_ChartOfAccounts2'
import Finance_Expenses from './pages/finance/finance_Expenses'
import Finance_JournalVouchers from './pages/finance/finance_JournalVouchers'
import Finance_LedgerExplorer from './pages/finance/finance_LedgerExplorer'
import Finance_TrialBalance from './pages/finance/finance_TrialBalance'
import Finance_ProfitLoss from './pages/finance/finance_ProfitLoss'
import Finance_BalanceSheet from './pages/finance/finance_BalanceSheet'
import Finance_PettyCash from './pages/finance/finance_PettyCash'
import { Finance_PatientAR, Finance_ARAging } from './pages/finance/finance_Receivables'
import { Finance_Vendors, Finance_Bills, Finance_VendorPayments, Finance_APAging } from './pages/finance/finance_Payables'
import { Finance_StaffPayroll, Finance_DoctorPayroll, Finance_AttendanceFinance, Finance_EarningsDeductions } from './pages/finance/finance_Payroll'
import Finance_ModuleIntegration from './pages/finance/finance_ModuleIntegration'
import Finance_Reconciliation from './pages/finance/finance_Reconciliation'
import Finance_Settings from './pages/finance/finance_Settings'
import Hospital_DoctorPayouts from './pages/hospital/hospital_DoctorPayouts'
import Hospital_CashSessions from './pages/hospital/hospital_CashSessions'
import Pharmacy_Login from './pages/pharmacy/pharmacy_Login'
import Pharmacy_Layout from './pages/pharmacy/pharmacy_Layout'
import Pharmacy_Dashboard from './pages/pharmacy/pharmacy_Dashboard'
import Pharmacy_POS from './pages/pharmacy/pharmacy_POS'
import Pharmacy_Prescriptions from './pages/pharmacy/pharmacy_Prescriptions'
import Pharmacy_PrescriptionIntake from './pages/pharmacy/pharmacy_PrescriptionIntake'
import Pharmacy_Referrals from './pages/pharmacy/pharmacy_Referrals'
import Pharmacy_Inventory from './pages/pharmacy/pharmacy_Inventory'
import Pharmacy_AddInvoicePage from './components/pharmacy/pharmacy_AddInvoicePage'
import Pharmacy_Customers from './pages/pharmacy/pharmacy_Customers'
import Pharmacy_Suppliers from './pages/pharmacy/pharmacy_Suppliers'
import Pharmacy_Companies from './pages/pharmacy/pharmacy_Companies'
import Pharmacy_Settings from './pages/pharmacy/pharmacy_Settings'
import Pharmacy_PayInOut from './pages/pharmacy/pharmacy_PayInOut'
import Pharmacy_ManagerCashCount from './pages/pharmacy/pharmacy_ManagerCashCount'
import Pharmacy_SalesHistory from './pages/pharmacy/pharmacy_SalesHistory'
import Pharmacy_PurchaseHistory from './pages/pharmacy/pharmacy_PurchaseHistory'
import Pharmacy_ReturnHistory from './pages/pharmacy/pharmacy_ReturnHistory'
import Pharmacy_Reports from './pages/pharmacy/pharmacy_Reports'
import Pharmacy_UserManagement from './pages/pharmacy/pharmacy_UserManagement'
import Pharmacy_Notifications from './pages/pharmacy/pharmacy_Notifications'
import Pharmacy_AuditLogs from './pages/pharmacy/pharmacy_AuditLogs'
import Pharmacy_Expenses from './pages/pharmacy/pharmacy_Expenses'
import Pharmacy_CustomerReturns from './pages/pharmacy/pharmacy_CustomerReturns'
import Pharmacy_SupplierReturns from './pages/pharmacy/pharmacy_SupplierReturns'
import Pharmacy_Guidelines from './pages/pharmacy/pharmacy_Guidelines'
import Pharmacy_PurchaseOrders from './pages/pharmacy/pharmacy_PurchaseOrders'
import Pharmacy_StaffAttendance from './pages/pharmacy/pharmacy_StaffAttendance'
import Pharmacy_StaffManagement from './pages/pharmacy/pharmacy_StaffManagement'
import Pharmacy_StaffSettings from './pages/pharmacy/pharmacy_StaffSettings'
import Pharmacy_StaffMonthly from './pages/pharmacy/pharmacy_StaffMonthly'
import Pharmacy_SidebarPermissions from './pages/pharmacy/pharmacy_SidebarPermissions'
// Indoor Pharmacy Imports
import IndoorPharmacy_Login from './pages/indoorpharmacy/indoorpharmacy_Login'
import IndoorPharmacy_Layout from './pages/indoorpharmacy/indoorpharmacy_Layout'
import IndoorPharmacy_Dashboard from './pages/indoorpharmacy/indoorpharmacy_Dashboard'
import IndoorPharmacy_POS from './pages/indoorpharmacy/indoorpharmacy_POS'
import IndoorPharmacy_Prescriptions from './pages/indoorpharmacy/indoorpharmacy_Prescriptions'
import IndoorPharmacy_PrescriptionIntake from './pages/indoorpharmacy/indoorpharmacy_PrescriptionIntake'
import IndoorPharmacy_Referrals from './pages/indoorpharmacy/indoorpharmacy_Referrals'
import IndoorPharmacy_Inventory from './pages/indoorpharmacy/indoorpharmacy_Inventory'
import IndoorPharmacy_AddInvoicePage from './components/indoorpharmacy/indoorpharmacy_AddInvoicePage'
import IndoorPharmacy_Customers from './pages/indoorpharmacy/indoorpharmacy_Customers'
import IndoorPharmacy_Suppliers from './pages/indoorpharmacy/indoorpharmacy_Suppliers'
import IndoorPharmacy_Companies from './pages/indoorpharmacy/indoorpharmacy_Companies'
import IndoorPharmacy_Settings from './pages/indoorpharmacy/indoorpharmacy_Settings'
import IndoorPharmacy_PayInOut from './pages/indoorpharmacy/indoorpharmacy_PayInOut'
import IndoorPharmacy_ManagerCashCount from './pages/indoorpharmacy/indoorpharmacy_ManagerCashCount'
import IndoorPharmacy_SalesHistory from './pages/indoorpharmacy/indoorpharmacy_SalesHistory'
import IndoorPharmacy_PurchaseHistory from './pages/indoorpharmacy/indoorpharmacy_PurchaseHistory'
import IndoorPharmacy_ReturnHistory from './pages/indoorpharmacy/indoorpharmacy_ReturnHistory'
import IndoorPharmacy_Reports from './pages/indoorpharmacy/indoorpharmacy_Reports'
import IndoorPharmacy_UserManagement from './pages/indoorpharmacy/indoorpharmacy_UserManagement'
import IndoorPharmacy_Notifications from './pages/indoorpharmacy/indoorpharmacy_Notifications'
import IndoorPharmacy_AuditLogs from './pages/indoorpharmacy/indoorpharmacy_AuditLogs'
import IndoorPharmacy_Expenses from './pages/indoorpharmacy/indoorpharmacy_Expenses'
import IndoorPharmacy_CustomerReturns from './pages/indoorpharmacy/indoorpharmacy_CustomerReturns'
import IndoorPharmacy_SupplierReturns from './pages/indoorpharmacy/indoorpharmacy_SupplierReturns'
import IndoorPharmacy_Guidelines from './pages/indoorpharmacy/indoorpharmacy_Guidelines'
import IndoorPharmacy_PurchaseOrders from './pages/indoorpharmacy/indoorpharmacy_PurchaseOrders'
import IndoorPharmacy_SidebarPermissions from './pages/indoorpharmacy/indoorpharmacy_SidebarPermissions'
import IndoorPharmacy_Shifts from './pages/indoorpharmacy/indoorpharmacy_Shifts'
import Diagnostic_Login from './pages/diagnostic/diagnostic_Login'
import Diagnostic_Layout from './pages/diagnostic/diagnostic_Layout'
import Diagnostic_Dashboard from './pages/diagnostic/diagnostic_Dashboard'
import Diagnostic_TokenGenerator from './pages/diagnostic/diagnostic_TokenGenerator'
import Diagnostic_Tests from './pages/diagnostic/diagnostic_Tests'
import Diagnostic_SampleTracking from './pages/diagnostic/Diagnostic_SampleTracking_Impl'
import Diagnostic_ResultEntry from './pages/diagnostic/diagnostic_ResultEntry'
import Diagnostic_ReportGenerator from './pages/diagnostic/diagnostic_ReportGenerator'
import Diagnostic_AuditLogs from './pages/diagnostic/diagnostic_AuditLogs'
import Diagnostic_Settings from './pages/diagnostic/diagnostic_Settings'
import Diagnostic_UserManagement from './pages/diagnostic/diagnostic_UserManagement'
import Diagnostic_SidebarPermissions from './pages/diagnostic/diagnostic_SidebarPermissions'
import Diagnostic_Referrals from './pages/diagnostic/diagnostic_Referrals'
import Diagnostic_IncomeLedger from './pages/diagnostic/diagnostic_IncomeLedger'
import Reception_Login from './pages/reception/reception_Login.tsx'
import Reception_Layout from './pages/reception/reception_Layout.tsx'
import Reception_Dashboard from './pages/reception/reception_Dashboard'
import Hospital_IPDBillingCollect from './pages/hospital/hospital_IPDBillingCollect'
import Hospital_IPDTransactions from './pages/hospital/hospital_IPDTransactions'
import Hospital_ERTransactions from './pages/hospital/hospital_ERTransactions'
import Hospital_ERBillingCollect from './pages/hospital/hospital_ERBillingCollect'
import Reception_UserManagement from './pages/reception/reception_UserManagement'
import Reception_StaffSettings from './pages/reception/reception_StaffSettings'
import Reception_SidebarPermissions from './pages/reception/reception_SidebarPermissions'
import Reception_MyActivityReport from './pages/reception/reception_MyActivityReport'
import Dialysis_Login from './pages/dialysis/dialysis_Login'
import Dialysis_Layout from './pages/dialysis/dialysis_Layout'
import Dialysis_Dashboard from './pages/dialysis/dialysis_Dashboard'
import Dialysis_TokenGenerator from './pages/dialysis/dialysis_TokenGenerator'
import Dialysis_TokenHistory from './pages/dialysis/dialysis_TokenHistory'
import Dialysis_Patients from './pages/dialysis/dialysis_Patients'
import Dialysis_Sessions from './pages/dialysis/dialysis_Sessions'
import Dialysis_Appointments from './pages/dialysis/dialysis_Appointments'
import Dialysis_UserManagement from './pages/dialysis/dialysis_UserManagement'
import Dialysis_SidebarPermissions from './pages/dialysis/dialysis_SidebarPermissions'
import Dialysis_AuditLogs from './pages/dialysis/dialysis_AuditLogs'
import Dialysis_Settings from './pages/dialysis/dialysis_Settings'
import Dialysis_MasterData from './pages/dialysis/dialysis_MasterData'
import Dialysis_PatientHistory from './pages/dialysis/dialysis_PatientHistory'
import Dialysis_DischargedPatients from './pages/dialysis/dialysis_DischargedPatients'
import Aesthetic_Login from './pages/aesthetic/aesthetic_Login'
import Aesthetic_Layout from './pages/aesthetic/aesthetic_Layout'
import Aesthetic_Dashboard from './pages/aesthetic/aesthetic_Dashboard'
import Aesthetic_TokenGeneratorPage from './pages/aesthetic/aesthetic_TokenGenerator'
import Aesthetic_TodayTokens from './pages/aesthetic/aesthetic_TodayTokens'
import Aesthetic_TokenHistoryPage from './pages/aesthetic/aesthetic_TokenHistory'
import Aesthetic_ReportsPage from './pages/aesthetic/aesthetic_Reports'
import Aesthetic_InventoryPage from './pages/aesthetic/aesthetic_Inventory'
import Aesthetic_AddInvoicePage from './components/aesthetic/aesthetic_AddInvoicePage'
import Aesthetic_ReturnHistory from './pages/aesthetic/aesthetic_ReturnHistory'
import Aesthetic_SuppliersPage from './pages/aesthetic/aesthetic_Suppliers'
import Aesthetic_Patients from './pages/aesthetic/aesthetic_Patients'
import Aesthetic_PatientProfile from './pages/aesthetic/aesthetic_PatientProfile'
import Aesthetic_ExpensesPage from './pages/aesthetic/aesthetic_Expenses'
import Aesthetic_DoctorManagementPage from './pages/aesthetic/aesthetic_DoctorManagement'
import Aesthetic_AuditLogsPage from './pages/aesthetic/aesthetic_AuditLogs'
import Aesthetic_UserManagementPage from './pages/aesthetic/aesthetic_UserManagement'
import Aesthetic_Notifications from './pages/aesthetic/aesthetic_Notifications'
import Aesthetic_StaffAttendance from './pages/aesthetic/aesthetic_StaffAttendance'
import Aesthetic_StaffManagement from './pages/aesthetic/aesthetic_StaffManagement'
import Aesthetic_StaffSettings from './pages/aesthetic/aesthetic_StaffSettings'
import Aesthetic_StaffMonthly from './pages/aesthetic/aesthetic_StaffMonthly'
import Aesthetic_StaffDashboard from './pages/aesthetic/aesthetic_StaffDashboard'
import Aesthetic_SupplierReturns from './pages/aesthetic/aesthetic_SupplierReturns'
import Aesthetic_PurchaseHistory from './pages/aesthetic/aesthetic_PurchaseHistory'
import Aesthetic_Settings from './pages/aesthetic/aesthetic_Settings'
import Aesthetic_ConsentTemplates from './pages/aesthetic/aesthetic_ConsentTemplates'
import Aesthetic_ProcedureCatalog from './pages/aesthetic/aesthetic_ProcedureCatalog'
import Aesthetic_DoctorFinance from './pages/aesthetic/aesthetic_DoctorFinance'
import Aesthetic_DoctorPayouts from './pages/aesthetic/aesthetic_DoctorPayouts'
import Aesthetic_DoctorSchedules from './pages/aesthetic/aesthetic_DoctorSchedules'
import Aesthetic_Appointments from './pages/aesthetic/aesthetic_Appointments'
import Aesthetic_SidebarPermissions from './pages/aesthetic/aesthetic_SidebarPermissions'
import NotFound from './pages/NotFound'
import { useEffect } from 'react'

export default function App() {
  // Hide the initial HTML preloader only after React has rendered content,
  // so there's no white-screen gap between preloader and app.
  useEffect(() => {
    // Double requestAnimationFrame ensures the browser has painted the DOM
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const hide = (window as any).__hidePreloader
        if (typeof hide === 'function') hide()
      })
    })
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/hospital/login" element={<Hospital_Login />} />
      <Route path="/aesthetic/login" element={<Aesthetic_Login />} />
      <Route path="/hospital" element={<Hospital_Layout />}>
        <Route index element={<Hospital_Dashboard />} />
        <Route path="today-tokens" element={<Hospital_TodayTokens />} />
        <Route path="token-history" element={<Hospital_TokenHistory />} />
        <Route path="my-activity-report" element={<Hospital_MyActivityReport />} />
        <Route path="token-generator" element={<Hospital_TokenGenerator />} />
        <Route path="emergency" element={<Hospital_EmergencyQueue />} />
        <Route path="emergency/:id" element={<Hospital_EmergencyChart />} />
        <Route path="emergency/:id/billing" element={<Hospital_ERBillingAdd />} />
        <Route path="emergency-services/add" element={<Hospital_EmergencyServiceAdd />} />
        <Route path="emergency-services" element={<Hospital_EmergencyServices />} />
        <Route path="emergency/:id/services" element={<Hospital_EmergencyServices />} />
        <Route path="departments" element={<Hospital_Departments />} />
        <Route path="equipment/dashboard" element={<EquipmentDashboard />} />
        <Route path="equipment" element={<EquipmentList />} />
        <Route path="equipment/:id" element={<EquipmentDetail />} />
        <Route path="equipment/suppliers" element={<EquipmentSuppliers />} />
        <Route path="equipment/suppliers/:id/ledger" element={<SupplierLedger />} />
        <Route path="equipment/purchases" element={<EquipmentPurchases />} />
        <Route path="ipd" element={<Hospital_IPDDashboard />} />
        <Route path="ipd-billing" element={<Hospital_IpdBillingAdd />} />
        <Route path="ipd-billing/collect" element={<Hospital_IPDBillingCollect />} />
        <Route path="ipd-transactions" element={<Hospital_IPDTransactions />} />
        <Route path="er-transactions" element={<Hospital_ERTransactions />} />
        <Route path="er-billing" element={<Hospital_ERBillingAdd />} />
        <Route path="er-billing/collect" element={<Hospital_ERBillingCollect />} />
        <Route path="bed-management" element={<Hospital_BedManagement />} />
        <Route path="patient-list" element={<Hospital_PatientList />} />
        <Route path="patient/:id" element={<Hospital_PatientProfile />} />
        <Route path="patient/:id/print" element={<Hospital_IpdPrintReport />} />
        <Route path="ipd-referrals" element={<Hospital_IPDReferrals />} />
        <Route path="er-referrals" element={<Hospital_ERReferrals />} />
        <Route path="er-discharged" element={<Hospital_ERDischarged />} />
        <Route path="ipd-services" element={<Hospital_IPDServices />} />
        <Route path="ipd-services/add" element={<Hospital_IPDServiceAdd />} />
        <Route path="discharge/:id" element={<Hospital_DischargeWizard />} />
        <Route path="discharged" element={<Hospital_Discharged />} />
        <Route path="staff-attendance" element={<Hospital_StaffAttendance />} />
        <Route path="staff-dashboard" element={<Hospital_StaffDashboard />} />
        <Route path="staff-management" element={<Hospital_StaffManagement />} />
        <Route path="staff-settings" element={<Hospital_StaffSettings />} />
        <Route path="staff-monthly" element={<Hospital_StaffMonthly />} />
        <Route path="finance/add-expense" element={<Finance_ExpenseHistory />} />
        <Route path="finance/transactions" element={<Finance_Transactions />} />
        <Route path="finance/expenses" element={<Finance_ExpenseHistory />} />
        <Route path="finance/cash-sessions" element={<Hospital_CashSessions />} />
        <Route path="finance/doctors" element={<Hospital_DoctorFinance />} />
        <Route path="finance/doctor-payouts" element={<Hospital_DoctorPayouts />} />
        <Route path="fbr" element={<Hospital_FbrDashboard />} />
        <Route path="fbr/settings" element={<Hospital_FbrSettings />} />
        <Route path="fbr/logs" element={<Hospital_FbrLogs />} />
        <Route path="fbr/reports" element={<Hospital_FbrReports />} />
        <Route path="fbr/credentials" element={<Hospital_FbrCredentials />} />
        <Route path="search-patients" element={<Hospital_SearchPatients />} />
        <Route path="doctors" element={<Hospital_Doctors />} />
        <Route path="doctor-schedules" element={<Hospital_DoctorSchedules />} />
        <Route path="appointments" element={<Hospital_Appointments />} />
        <Route path="forms/consent-forms" element={<Hospital_ConsentFormList />} />
        <Route path="forms/received-deaths" element={<Hospital_ReceivedDeathList />} />
        <Route path="forms/death-certificates" element={<Hospital_DeathCertificateList />} />
        <Route path="forms/birth-certificates" element={<Hospital_BirthCertificateList />} />
        <Route path="forms/short-stays" element={<Hospital_ShortStayList />} />
        <Route path="forms/discharge-summaries" element={<Hospital_DischargeSummaryList />} />
        <Route path="forms/invoices" element={<Hospital_InvoiceList />} />
        <Route path="ipd/admissions/:id/forms/received-death" element={<Hospital_ReceivedDeathDetail />} />
        <Route path="ipd/admissions/:id/forms/death-certificate" element={<Hospital_DeathCertificateDetail />} />
        <Route path="ipd/admissions/:id/forms/birth-certificate" element={<Hospital_BirthCertificateDetail />} />
        <Route path="ipd/admissions/:id/forms/short-stay" element={<Hospital_ShortStayDetail />} />
        <Route path="ipd/admissions/:id/forms/discharge-summary" element={<Hospital_DischargeSummaryDetail />} />
        <Route path="ipd/admissions/:id/invoice" element={<IpdInvoiceSlip />} />
        <Route path="ipd/admissions/:id/billing" element={<Hospital_IpdBillingAdd />} />
        <Route path="user-management" element={<Hospital_UserManagement />} />
        <Route path="sidebar-permissions" element={<Hospital_SidebarPermissions />} />
        <Route path="audit" element={<Hospital_AuditLogs />} />
        <Route path="settings" element={<Hospital_Settings />} />
        <Route path="backup" element={<Hospital_Backup />} />
        {/* Corporate Panel */}
        <Route path="corporate" element={<Hospital_CorporateDashboard />} />
        <Route path="corporate/companies" element={<Hospital_CorporateCompanies />} />
        <Route path="corporate/rate-rules" element={<Hospital_CorporateRateRules />} />
        <Route path="corporate/transactions" element={<Hospital_CorporateTransactions />} />
        <Route path="corporate/claims" element={<Hospital_CorporateClaims />} />
        <Route path="corporate/payments" element={<Hospital_CorporatePayments />} />
        <Route path="corporate/reports" element={<Hospital_CorporateReports />} />
        {/* Store / Inventory Module */}
        <Route path="store" element={<Store_Dashboard />} />
        <Route path="store/suppliers" element={<Store_Suppliers />} />
        <Route path="store/purchase-history" element={<Store_PurchaseList />} />
        <Route path="store/add-purchase" element={<Store_AddPurchase />} />
        <Route path="store/inventory" element={<Store_Inventory />} />
        <Route path="store/issue-history" element={<Store_IssueHistory />} />
        <Route path="store/reports" element={<Store_Reports />} />
        <Route path="store/purchase-orders" element={<Store_PurchaseOrders />} />
        {/* Ambulance Module */}
        <Route path="ambulance" element={<Ambulance_Dashboard />} />
        <Route path="ambulance/master" element={<Ambulance_Master />} />
        <Route path="ambulance/trips" element={<Ambulance_Trips />} />
        <Route path="ambulance/fuel" element={<Ambulance_Fuel />} />
        <Route path="ambulance/expenses" element={<Ambulance_Expenses />} />
        <Route path="ambulance/reports" element={<Ambulance_Reports />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/aesthetic" element={<Aesthetic_Layout />}>
        <Route index element={<Aesthetic_Dashboard />} />
        <Route path="today-tokens" element={<Aesthetic_TodayTokens />} />
        <Route path="token-generator" element={<Aesthetic_TokenGeneratorPage />} />
        <Route path="token-history" element={<Aesthetic_TokenHistoryPage />} />
        <Route path="reports" element={<Aesthetic_ReportsPage />} />
        <Route path="inventory" element={<Aesthetic_InventoryPage />} />
        <Route path="inventory/add-invoice" element={<Aesthetic_AddInvoicePage />} />
        <Route path="patients" element={<Aesthetic_Patients />} />
        <Route path="patients/mrn/:mrn" element={<Aesthetic_PatientProfile />} />
        <Route path="return-history" element={<Aesthetic_ReturnHistory />} />
        <Route path="suppliers" element={<Aesthetic_SuppliersPage />} />
        <Route path="supplier-returns" element={<Aesthetic_SupplierReturns />} />
        <Route path="purchase-history" element={<Aesthetic_PurchaseHistory />} />
        <Route path="notifications" element={<Aesthetic_Notifications />} />
        <Route path="expenses" element={<Aesthetic_ExpensesPage />} />
        <Route path="doctor-management" element={<Aesthetic_DoctorManagementPage />} />
        <Route path="doctor-schedules" element={<Aesthetic_DoctorSchedules />} />
        <Route path="appointments" element={<Aesthetic_Appointments />} />
        <Route path="doctor-finance" element={<Aesthetic_DoctorFinance />} />
        <Route path="doctor-payouts" element={<Aesthetic_DoctorPayouts />} />
        <Route path="audit-logs" element={<Aesthetic_AuditLogsPage />} />
        <Route path="user-management" element={<Aesthetic_UserManagementPage />} />
        <Route path="sidebar-permissions" element={<Aesthetic_SidebarPermissions />} />
        <Route path="procedure-catalog" element={<Aesthetic_ProcedureCatalog />} />
        <Route path="consent-templates" element={<Aesthetic_ConsentTemplates />} />
        <Route path="staff-attendance" element={<Aesthetic_StaffAttendance />} />
        <Route path="staff-management" element={<Aesthetic_StaffManagement />} />
        <Route path="staff-settings" element={<Aesthetic_StaffSettings />} />
        <Route path="staff-monthly" element={<Aesthetic_StaffMonthly />} />
        <Route path="staff-dashboard" element={<Aesthetic_StaffDashboard />} />
        <Route path="settings" element={<Aesthetic_Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/diagnostic/login" element={<Diagnostic_Login />} />
      <Route path="/diagnostic" element={<Diagnostic_Layout />}>
        <Route index element={<Diagnostic_Dashboard />} />
        <Route path="token-generator" element={<Diagnostic_TokenGenerator />} />
        <Route path="tests" element={<Diagnostic_Tests />} />
        <Route path="sample-tracking" element={<Diagnostic_SampleTracking />} />
        <Route path="result-entry" element={<Diagnostic_ResultEntry />} />
        <Route path="report-generator" element={<Diagnostic_ReportGenerator />} />
        <Route path="income-ledger" element={<Diagnostic_IncomeLedger />} />
        <Route path="referrals" element={<Diagnostic_Referrals />} />
        <Route path="sidebar-permissions" element={<Diagnostic_SidebarPermissions />} />
        <Route path="user-management" element={<Diagnostic_UserManagement />} />
        <Route path="audit-logs" element={<Diagnostic_AuditLogs />} />
        <Route path="settings" element={<Diagnostic_Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/doctor" element={<Doctor_Layout />}>
        <Route index element={<Doctor_Dashboard />} />
        <Route path="patients" element={<Doctor_Patients />} />
        <Route path="ipd-patients" element={<Hospital_PatientList />} />
        <Route path="patient/:id" element={<Hospital_PatientProfile />} />
        <Route path="patient-search" element={<Hospital_SearchPatients />} />
        <Route path="prescription" element={<Doctor_Prescription />} />
        <Route path="prescriptions" element={<Doctor_PrescriptionHistory />} />
        <Route path="prescription-history" element={<Doctor_PrescriptionHistory />} />
        <Route path="prescription-templates" element={<Doctor_PrescriptionTemplates />} />
        <Route path="reports" element={<Doctor_Reports />} />
        <Route path="referrals" element={<Doctor_Referrals />} />
        <Route path="notifications" element={<Doctor_Notifications />} />
        <Route path="settings" element={<Doctor_Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/lab/login" element={<Lab_Login />} />
      <Route path="/lab" element={<Lab_Layout />}>
        <Route index element={<ErrorBoundary name="Dashboard"><Lab_Dashboard /></ErrorBoundary>} />
        <Route path="today-tokens" element={<ErrorBoundary name="Today's Tokens"><Lab_TodaysTokens /></ErrorBoundary>} />
        <Route path="orders" element={<ErrorBoundary name="Orders"><Lab_Orders /></ErrorBoundary>} />
        <Route path="tracking" element={<ErrorBoundary name="Tracking"><Lab_Tracking /></ErrorBoundary>} />
        <Route path="barcodes" element={<ErrorBoundary name="Barcodes"><Lab_Barcodes /></ErrorBoundary>} />
        <Route path="appointments" element={<ErrorBoundary name="Appointments"><Lab_Appointments /></ErrorBoundary>} />
        <Route path="tests" element={<ErrorBoundary name="Tests"><Lab_Tests /></ErrorBoundary>} />
        <Route path="results" element={<ErrorBoundary name="Results"><Lab_Results /></ErrorBoundary>} />
        <Route path="referrals" element={<ErrorBoundary name="Referrals"><Lab_Referrals /></ErrorBoundary>} />
        <Route path="report-approval" element={<ErrorBoundary name="Report Approval"><Lab_ReportApproval /></ErrorBoundary>} />
        <Route path="reports" element={<ErrorBoundary name="Reports"><Lab_ReportGenerator /></ErrorBoundary>} />
        <Route path="income-ledger" element={<ErrorBoundary name="Income Ledger"><Lab_IncomeLedger /></ErrorBoundary>} />
        <Route path="reports-summary" element={<ErrorBoundary name="Reports Summary"><Lab_Reports /></ErrorBoundary>} />
        <Route path="inventory" element={<ErrorBoundary name="Inventory"><Lab_Inventory /></ErrorBoundary>} />
        <Route path="inventory/add-invoice" element={<ErrorBoundary name="Add Invoice"><Lab_AddInvoicePage /></ErrorBoundary>} />
        <Route path="inventory/edit-invoice/:id" element={<ErrorBoundary name="Edit Invoice"><Lab_AddInvoicePage /></ErrorBoundary>} />
        <Route path="suppliers" element={<ErrorBoundary name="Suppliers"><Lab_Suppliers /></ErrorBoundary>} />
        <Route path="companies" element={<ErrorBoundary name="Companies"><Lab_Companies /></ErrorBoundary>} />
        <Route path="supplier-returns" element={<ErrorBoundary name="Supplier Returns"><Lab_SupplierReturns /></ErrorBoundary>} />
        <Route path="return-history" element={<ErrorBoundary name="Return History"><Lab_ReturnHistory /></ErrorBoundary>} />
        <Route path="purchase-orders" element={<ErrorBoundary name="Purchase Orders"><Lab_PurchaseOrders /></ErrorBoundary>} />
        <Route path="purchase-history" element={<ErrorBoundary name="Purchase History"><Lab_PurchaseHistory /></ErrorBoundary>} />
        <Route path="user-management" element={<ErrorBoundary name="User Management"><Lab_UserManagement /></ErrorBoundary>} />
        <Route path="sidebar-permissions" element={<ErrorBoundary name="Sidebar Permissions"><Lab_SidebarPermissions /></ErrorBoundary>} />
        <Route path="staff-attendance" element={<ErrorBoundary name="Staff Attendance"><Lab_StaffAttendance /></ErrorBoundary>} />
        <Route path="staff-management" element={<ErrorBoundary name="Staff Management"><Lab_StaffManagement /></ErrorBoundary>} />
        <Route path="staff-settings" element={<ErrorBoundary name="Staff Settings"><Lab_StaffSettings /></ErrorBoundary>} />
        <Route path="staff-monthly" element={<ErrorBoundary name="Staff Monthly"><Lab_StaffMonthly /></ErrorBoundary>} />
        <Route path="expenses" element={<ErrorBoundary name="Expenses"><Lab_Expenses /></ErrorBoundary>} />
        <Route path="audit-logs" element={<ErrorBoundary name="Audit Logs"><Lab_AuditLogs /></ErrorBoundary>} />
        <Route path="pay-in-out" element={<ErrorBoundary name="Pay In/Out"><Lab_PayInOut /></ErrorBoundary>} />
        <Route path="manager-cash-count" element={<ErrorBoundary name="Cash Count"><Lab_ManagerCashCount /></ErrorBoundary>} />
        <Route path="settings" element={<ErrorBoundary name="Settings"><Lab_Settings /></ErrorBoundary>} />
        {/* Collection Centers */}
        <Route path="collection-centers" element={<ErrorBoundary name="Collection Centers"><Lab_CollectionCenters /></ErrorBoundary>} />
        <Route path="center-revenue" element={<ErrorBoundary name="Center Revenue"><Lab_CollectionCenterRevenue /></ErrorBoundary>} />
        <Route path="center-payments" element={<ErrorBoundary name="Center Payments"><Lab_CollectionCenterPayments /></ErrorBoundary>} />
        <Route path="center-rate-list" element={<ErrorBoundary name="Center Rate List"><Lab_CenterRateList /></ErrorBoundary>} />
        {/* Mega-upgrade additions */}
        <Route path="critical-values" element={<ErrorBoundary name="Critical Values"><Lab_CriticalValues /></ErrorBoundary>} />
        <Route path="total-tests" element={<ErrorBoundary name="Total Tests"><Lab_TotalTests /></ErrorBoundary>} />
        <Route path="test-packages" element={<ErrorBoundary name="Test Packages"><Lab_TestPackages /></ErrorBoundary>} />
        <Route path="outsource-labs" element={<ErrorBoundary name="Outsource Labs"><Lab_OutsourceLabs /></ErrorBoundary>} />
        <Route path="outsource-rates" element={<ErrorBoundary name="Outsource Rates"><Lab_OutsourceRateList /></ErrorBoundary>} />
        <Route path="outsource-dispatch" element={<ErrorBoundary name="Outsource Dispatch"><Lab_OutsourceDispatch /></ErrorBoundary>} />
        <Route path="patient-cards" element={<ErrorBoundary name="Patient Cards"><Lab_PatientCards /></ErrorBoundary>} />
        <Route path="ward-imports" element={<ErrorBoundary name="Ward Imports"><Lab_WardImports /></ErrorBoundary>} />
        <Route path="daily-worksheet" element={<ErrorBoundary name="Daily Worksheet"><Lab_DailyWorksheet /></ErrorBoundary>} />
        <Route path="main-register" element={<ErrorBoundary name="Main Register"><Lab_MainRegister /></ErrorBoundary>} />
        <Route path="tat" element={<ErrorBoundary name="TAT"><Lab_TAT /></ErrorBoundary>} />
        {/* Blood Bank */}
        <Route path="bb/donors" element={<ErrorBoundary name="BB Donors"><Lab_BB_Donors /></ErrorBoundary>} />
        <Route path="bb/inventory" element={<ErrorBoundary name="BB Inventory"><Lab_BB_Inventory /></ErrorBoundary>} />
        <Route path="bb/receivers" element={<ErrorBoundary name="BB Receivers"><Lab_BB_Receivers /></ErrorBoundary>} />
        {/* BB reports-labels and settings routes removed */}
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/pharmacy/login" element={<Pharmacy_Login />} />
      <Route path="/pharmacy" element={<Pharmacy_Layout />}>
        <Route index element={<Pharmacy_Dashboard />} />
        <Route path="pos" element={<Pharmacy_POS />} />
        <Route path="prescriptions" element={<Pharmacy_Prescriptions />} />
        <Route path="referrals" element={<Pharmacy_Referrals />} />
        <Route path="prescriptions/:id" element={<Pharmacy_PrescriptionIntake />} />
        <Route path="inventory" element={<Pharmacy_Inventory />} />
        <Route path="inventory/add-invoice" element={<Pharmacy_AddInvoicePage />} />
        <Route path="inventory/edit-invoice/:id" element={<Pharmacy_AddInvoicePage />} />
        <Route path="customers" element={<Pharmacy_Customers />} />
        <Route path="suppliers" element={<Pharmacy_Suppliers />} />
        <Route path="companies" element={<Pharmacy_Companies />} />
        <Route path="sales-history" element={<Pharmacy_SalesHistory />} />
        <Route path="purchase-history" element={<Pharmacy_PurchaseHistory />} />
        <Route path="return-history" element={<Pharmacy_ReturnHistory />} />
        <Route path="reports" element={<Pharmacy_Reports />} />
        <Route path="notifications" element={<Pharmacy_Notifications />} />
        <Route path="supplier-returns" element={<Pharmacy_SupplierReturns />} />
        <Route path="customer-returns" element={<Pharmacy_CustomerReturns />} />
        <Route path="staff-attendance" element={<Pharmacy_StaffAttendance />} />
        <Route path="staff-management" element={<Pharmacy_StaffManagement />} />
        <Route path="staff-settings" element={<Pharmacy_StaffSettings />} />
        <Route path="staff-monthly" element={<Pharmacy_StaffMonthly />} />
        <Route path="guidelines" element={<Pharmacy_Guidelines />} />
        <Route path="purchase-orders" element={<Pharmacy_PurchaseOrders />} />
        <Route path="settings" element={<Pharmacy_Settings />} />
        <Route path="sidebar-permissions" element={<Pharmacy_SidebarPermissions />} />
        <Route path="user-management" element={<Pharmacy_UserManagement />} />
        <Route path="audit-logs" element={<Pharmacy_AuditLogs />} />
        <Route path="expenses" element={<Pharmacy_Expenses />} />
        <Route path="pay-in-out" element={<Pharmacy_PayInOut />} />
        <Route path="manager-cash-count" element={<Pharmacy_ManagerCashCount />} />
        <Route path="returns" element={<Pharmacy_CustomerReturns />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      {/* Indoor Pharmacy Routes */}
      <Route path="/indoor-pharmacy/login" element={<IndoorPharmacy_Login />} />
      <Route path="/indoor-pharmacy" element={<IndoorPharmacy_Layout />}>
        <Route index element={<IndoorPharmacy_Dashboard />} />
        <Route path="pos" element={<IndoorPharmacy_POS />} />
        <Route path="prescriptions" element={<IndoorPharmacy_Prescriptions />} />
        <Route path="referrals" element={<IndoorPharmacy_Referrals />} />
        <Route path="prescriptions/:id" element={<IndoorPharmacy_PrescriptionIntake />} />
        <Route path="inventory" element={<IndoorPharmacy_Inventory />} />
        <Route path="inventory/add-invoice" element={<IndoorPharmacy_AddInvoicePage />} />
        <Route path="inventory/edit-invoice/:id" element={<IndoorPharmacy_AddInvoicePage />} />
        <Route path="customers" element={<IndoorPharmacy_Customers />} />
        <Route path="suppliers" element={<IndoorPharmacy_Suppliers />} />
        <Route path="companies" element={<IndoorPharmacy_Companies />} />
        <Route path="sales-history" element={<IndoorPharmacy_SalesHistory />} />
        <Route path="purchase-history" element={<IndoorPharmacy_PurchaseHistory />} />
        <Route path="return-history" element={<IndoorPharmacy_ReturnHistory />} />
        <Route path="reports" element={<IndoorPharmacy_Reports />} />
        <Route path="notifications" element={<IndoorPharmacy_Notifications />} />
        <Route path="supplier-returns" element={<IndoorPharmacy_SupplierReturns />} />
        <Route path="customer-returns" element={<IndoorPharmacy_CustomerReturns />} />
        <Route path="guidelines" element={<IndoorPharmacy_Guidelines />} />
        <Route path="purchase-orders" element={<IndoorPharmacy_PurchaseOrders />} />
        <Route path="settings" element={<IndoorPharmacy_Settings />} />
        <Route path="sidebar-permissions" element={<IndoorPharmacy_SidebarPermissions />} />
        <Route path="shifts" element={<IndoorPharmacy_Shifts />} />
        <Route path="user-management" element={<IndoorPharmacy_UserManagement />} />
        <Route path="audit-logs" element={<IndoorPharmacy_AuditLogs />} />
        <Route path="expenses" element={<IndoorPharmacy_Expenses />} />
        <Route path="pay-in-out" element={<IndoorPharmacy_PayInOut />} />
        <Route path="manager-cash-count" element={<IndoorPharmacy_ManagerCashCount />} />
        <Route path="returns" element={<IndoorPharmacy_CustomerReturns />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/finance/login" element={<Finance_Login />} />
      <Route path="/finance" element={<Finance_Layout />}>
        {/* Dashboard */}
        <Route index element={<Finance_Dashboard />} />

        {/* General Ledger */}
        <Route path="chart-of-accounts"  element={<Finance_ChartOfAccounts2 />} />
        <Route path="journal-vouchers"   element={<Finance_JournalVouchers />} />
        <Route path="ledger-explorer"    element={<Finance_LedgerExplorer />} />
        <Route path="trial-balance"      element={<Finance_TrialBalance />} />
        <Route path="profit-loss"        element={<Finance_ProfitLoss />} />
        <Route path="balance-sheet"      element={<Finance_BalanceSheet />} />
        <Route path="petty-cash"         element={<Finance_PettyCash />} />
        <Route path="ledger/:accountId"  element={<Finance_AccountLedger />} />

        {/* Receivables */}
        <Route path="receivables/patient"   element={<Finance_PatientAR />} />
        {/* <Route path="receivables/corporate" element={<Finance_CorporateAR />} /> */}
        <Route path="receivables/aging"     element={<Finance_ARAging />} />

        {/* Payables */}
        <Route path="vendors"          element={<Finance_Vendors />} />
        <Route path="bills"            element={<Finance_Bills />} />
        <Route path="vendor-payments"  element={<Finance_VendorPayments />} />
        <Route path="payables/aging"   element={<Finance_APAging />} />

        {/* Expenses */}
        <Route path="expenses" element={<Finance_Expenses />} />

        {/* Payroll & HR */}
        <Route path="payroll/staff"                element={<Finance_StaffPayroll />} />
        <Route path="payroll/doctors"              element={<Finance_DoctorPayroll />} />
        <Route path="payroll/attendance"           element={<Finance_AttendanceFinance />} />
        <Route path="payroll/earnings-deductions"  element={<Finance_EarningsDeductions />} />

        {/* Module Integrations */}
        <Route path="integrations/:module" element={<Finance_ModuleIntegration />} />

        {/* Reconciliation & admin */}
        <Route path="reconciliation"       element={<Finance_Reconciliation />} />
        <Route path="audit-logs"           element={<Finance_AuditLogs />} />
        <Route path="sidebar-permissions"  element={<Finance_SidebarPermissions />} />
        <Route path="user-management"      element={<Finance_UserManagement />} />
        <Route path="settings"             element={<Finance_Settings />} />

        {/* Legacy routes — still reachable if bookmarked */}
        <Route path="cash-handover"        element={<Finance_CashHandover />} />
        <Route path="pending-handovers"    element={<Finance_PendingHandovers />} />
        <Route path="user-accounts"        element={<Finance_UserAccounts />} />
        <Route path="transactions"         element={<Finance_Transactions />} />
        <Route path="add-expense"          element={<Finance_ExpenseHistory />} />
        <Route path="doctor-payouts"       element={<Hospital_DoctorPayouts />} />
        <Route path="cash-sessions"        element={<Hospital_CashSessions />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/reception/login" element={<Reception_Login />} />
      <Route path="/reception" element={<Reception_Layout />}>
        <Route index element={<Reception_Dashboard />} />
        <Route path="dashboard" element={<Reception_Dashboard />} />
        <Route path="token-generator" element={<Hospital_TokenGenerator />} />
        <Route path="today-tokens" element={<Hospital_TodayTokens />} />
        <Route path="ipd-billing" element={<Hospital_IpdBillingAdd />} />
        <Route path="ipd-billing/collect" element={<Hospital_IPDBillingCollect />} />
        <Route path="ipd-transactions" element={<Hospital_IPDTransactions />} />
        <Route path="er-billing" element={<Hospital_ERBillingCollect />} />
        <Route path="er-billing/add" element={<Hospital_ERBillingAdd />} />
        <Route path="er-transactions" element={<Hospital_ERTransactions />} />
        <Route path="user-management" element={<Reception_UserManagement />} />
        <Route path="staff-settings" element={<Reception_StaffSettings />} />
        <Route path="sidebar-permissions" element={<Reception_SidebarPermissions />} />
        <Route path="my-activity-report" element={<Reception_MyActivityReport />} />
        <Route path="diagnostic/token-generator" element={<Diagnostic_TokenGenerator />} />
        <Route path="diagnostic/sample-tracking" element={<Diagnostic_SampleTracking />} />
        <Route path="lab/sample-intake" element={<Lab_Orders />} />
        <Route path="lab/tokens" element={<Lab_TodaysTokens />} />
        <Route path="lab/sample-tracking" element={<Lab_Tracking />} />
        <Route path="lab/manager-cash-count" element={<Lab_ManagerCashCount />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/dialysis/login" element={<Dialysis_Login />} />
      <Route path="/dialysis" element={<Dialysis_Layout />}>
        <Route index element={<Dialysis_Dashboard />} />
        <Route path="token-generator" element={<Dialysis_TokenGenerator />} />
        <Route path="token-history" element={<Dialysis_TokenHistory />} />
        <Route path="patients" element={<Dialysis_Patients />} />
        <Route path="sessions" element={<Dialysis_Sessions />} />
        <Route path="appointments" element={<Dialysis_Appointments />} />
        <Route path="user-management" element={<Dialysis_UserManagement />} />
        <Route path="sidebar-permissions" element={<Dialysis_SidebarPermissions />} />
        <Route path="audit" element={<Dialysis_AuditLogs />} />
        <Route path="settings" element={<Dialysis_Settings />} />
        <Route path="master-data" element={<Dialysis_MasterData />} />
        <Route path="patient-history" element={<Dialysis_PatientHistory />} />
        <Route path="discharged-patients" element={<Dialysis_DischargedPatients />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
