import { lazy, Suspense, useState, useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import GlobalToast from './components/ui/GlobalToast'

// Eagerly load critical pages (Home and Login pages) - no loading flash
import Home from './pages/Home'
import NotFound from './pages/NotFound'
import Hospital_Login from './pages/hospital/hospital_Login'
import Aesthetic_Login from './pages/aesthetic/aesthetic_Login'
import Lab_Login from './pages/lab/lab_Login'
import Pharmacy_Login from './pages/pharmacy/pharmacy_Login'
import Finance_Login from './pages/finance/finance_Login'
import Diagnostic_Login from './pages/diagnostic/diagnostic_Login'
import Reception_Login from './pages/reception/reception_Login'
import Dialysis_Login from './pages/dialysis/dialysis_Login'
import IndoorPharmacy_Login from './pages/indoorpharmacy/indoorpharmacy_Login'
import Camp_Login from './pages/camp/camp_Login'

// Lazy load all other pages for faster startup
const SuperAdminLogin = lazy(() => import('./pages/superAdmin/SuperAdminLogin'))
const SuperAdminDashboard = lazy(() => import('./pages/superAdmin/SuperAdminDashboard'))
const ModuleManager = lazy(() => import('./pages/superAdmin/ModuleManager'))
const ClientProfilePage = lazy(() => import('./pages/superAdmin/ClientProfilePage'))
const UsageStatsPage = lazy(() => import('./pages/superAdmin/UsageStatsPage'))
const SuperAdminUsersPage = lazy(() => import('./pages/superAdmin/SuperAdminUsersPage'))
const AdminUserManagementPage = lazy(() => import('./pages/admin/AdminUserManagementPage'))
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'))
const SuperAdminGuard = lazy(() => import('./guards/SuperAdminGuard'))
const AdminGuard = lazy(() => import('./guards/AdminGuard'))
const Hospital_Layout = lazy(() => import('./pages/hospital/hospital_Layout'))
const Hospital_IPDDashboard = lazy(() => import('./pages/hospital/hospital_ipddashboard'))
const Hospital_SidebarPermissions = lazy(() => import('./pages/hospital/hospital_SidebarPermissions'))
const Hospital_BedManagement = lazy(() => import('./pages/hospital/hospital_BedManagement'))
const Hospital_ERBeds = lazy(() => import('./pages/hospital/hospital_ERBeds'))
const Hospital_TokenGenerator = lazy(() => import('./pages/hospital/hospital_TokenGenerator'))
const Hospital_TodayTokens = lazy(() => import('./pages/hospital/hospital_TodayTokens'))
const Hospital_TokenHistory = lazy(() => import('./pages/hospital/hospital_TokenHistory'))
const Hospital_MyActivityReport = lazy(() => import('./pages/hospital/hospital_MyActivityReport'))
const Hospital_EmergencyQueue = lazy(() => import('./pages/hospital/hospital_EmergencyQueue'))
const Hospital_EmergencyChart = lazy(() => import('./pages/hospital/hospital_EmergencyChart'))
const Hospital_ErDischarged = lazy(() => import('./pages/hospital/hospital_ErDischarged'))
const Hospital_ERBillingAdd = lazy(() => import('./pages/hospital/hospital_ERBillingAdd'))
const Hospital_EmergencyServices = lazy(() => import('./pages/hospital/hospital_EmergencyServices'))
const Hospital_EmergencyServiceAdd = lazy(() => import('./pages/hospital/hospital_EmergencyServiceAdd'))
const Hospital_Departments = lazy(() => import('./pages/hospital/hospital_Departments'))
const Hospital_SearchPatients = lazy(() => import('./pages/hospital/hospital_SearchPatients'))
const Hospital_UserManagement = lazy(() => import('./pages/hospital/hospital_UserManagement'))
const Hospital_AuditLogs = lazy(() => import('./pages/hospital/hospital_AuditLogs'))
const Hospital_Settings = lazy(() => import('./pages/hospital/hospital_Settings'))
const Hospital_Backup = lazy(() => import('./pages/hospital/hospital_Backup'))
const Hospital_Doctors = lazy(() => import('./pages/hospital/hospital_Doctors'))
const Hospital_PatientList = lazy(() => import('./pages/hospital/hospital_PatientList.tsx'))
const Hospital_Patients = lazy(() => import('./pages/hospital/hospital_Patients'))
const Hospital_PatientProfile = lazy(() => import('./pages/hospital/hospital_PatientProfile.tsx'))
const Hospital_DischargeForms = lazy(() => import('./pages/hospital/hospital_DischargeWizard.tsx'))
const Hospital_Discharged = lazy(() => import('./pages/hospital/hospital_Discharged.tsx'))
const Hospital_StaffAttendance = lazy(() => import('./pages/hospital/hospital_StaffAttendance.tsx'))
const Hospital_StaffLeaves = lazy(() => import('./pages/hospital/hospital_StaffLeaves.tsx'))
const Hospital_StaffManagement = lazy(() => import('./pages/hospital/hospital_StaffManagement.tsx'))
const Hospital_StaffSettings = lazy(() => import('./pages/hospital/hospital_StaffSettings.tsx'))
const Hospital_BiometricSettings = lazy(() => import('./pages/hospital/hospital_BiometricSettings.tsx'))
const Hospital_StaffMonthly = lazy(() => import('./pages/hospital/hospital_StaffMonthly.tsx'))
const Hospital_StaffDashboard = lazy(() => import('./pages/hospital/hospital_StaffDashboard.tsx'))
const Hospital_Dashboard = lazy(() => import('./pages/hospital/hospital_Dashboard.tsx'))
const Hospital_DoctorFinance = lazy(() => import('./pages/hospital/hospital_DoctorFinance.tsx'))
const Hospital_IPDReferrals = lazy(() => import('./pages/hospital/hospital_IPDReferrals.tsx'))
const Hospital_ERReferrals = lazy(() => import('./pages/hospital/hospital_ERReferrals.tsx'))
const Hospital_IPDServices = lazy(() => import('./pages/hospital/hospital_IPDServices.tsx'))
const Hospital_IPDServiceAdd = lazy(() => import('./pages/hospital/hospital_IPDServiceAdd.tsx'))
const Hospital_DoctorSchedules = lazy(() => import('./pages/hospital/hospital_DoctorSchedules'))
const Hospital_Appointments = lazy(() => import('./pages/hospital/hospital_Appointments'))
const EquipmentDashboard = lazy(() => import('./features/hospital').then(m => ({ default: m.EquipmentDashboard })))
const EquipmentList = lazy(() => import('./features/hospital').then(m => ({ default: m.EquipmentList })))
const EquipmentSuppliers = lazy(() => import('./features/hospital').then(m => ({ default: m.EquipmentSuppliers })))
const EquipmentPurchases = lazy(() => import('./features/hospital').then(m => ({ default: m.EquipmentPurchases })))
const SupplierLedger = lazy(() => import('./features/hospital').then(m => ({ default: m.SupplierLedger })))
const EquipmentDetail = lazy(() => import('./features/hospital').then(m => ({ default: m.EquipmentDetail })))
const Hospital_ReceivedDeathList = lazy(() => import('./pages/hospital/forms/Hospital_ReceivedDeathList.tsx'))
const Hospital_DeathCertificateList = lazy(() => import('./pages/hospital/forms/Hospital_DeathCertificateList.tsx'))
const Hospital_BirthCertificateList = lazy(() => import('./pages/hospital/forms/Hospital_BirthCertificateList.tsx'))
const Hospital_ShortStayList = lazy(() => import('./pages/hospital/forms/Hospital_ShortStayList.tsx'))
const Hospital_DischargeSummaryList = lazy(() => import('./pages/hospital/forms/Hospital_DischargeSummaryList.tsx'))
const Hospital_ReceivedDeathDetail = lazy(() => import('./pages/hospital/forms/Hospital_ReceivedDeathDetail.tsx'))
const Hospital_DeathCertificateDetail = lazy(() => import('./pages/hospital/forms/Hospital_DeathCertificateDetail.tsx'))
const Hospital_BirthCertificateDetail = lazy(() => import('./pages/hospital/forms/Hospital_BirthCertificateDetail.tsx'))
const Hospital_ShortStayDetail = lazy(() => import('./pages/hospital/forms/Hospital_ShortStayDetail.tsx'))
const Hospital_DischargeSummaryDetail = lazy(() => import('./pages/hospital/forms/Hospital_DischargeSummaryDetail.tsx'))
const Hospital_InvoiceList = lazy(() => import('./pages/hospital/forms/Hospital_InvoiceList.tsx'))
const IpdInvoiceSlip = lazy(() => import('./components/hospital/hospital_IpdInvoiceslip'))
const Hospital_IpdBillingAdd = lazy(() => import('./pages/hospital/hospital_IpdBillingAdd'))
const Hospital_CorporateDashboard = lazy(() => import('./pages/hospital/corporate/hospital_CorporateDashboard'))
const Hospital_CorporateCompanies = lazy(() => import('./pages/hospital/corporate/hospital_CorporateCompanies'))
const Hospital_CorporateRateRules = lazy(() => import('./pages/hospital/corporate/hospital_CorporateRateRules'))
const Hospital_CorporateTransactions = lazy(() => import('./pages/hospital/corporate/hospital_CorporateTransactions'))
const Hospital_CorporateClaims = lazy(() => import('./pages/hospital/corporate/hospital_CorporateClaims'))
const Hospital_CorporatePayments = lazy(() => import('./pages/hospital/corporate/hospital_CorporatePayments'))
const Hospital_CorporateReports = lazy(() => import('./pages/hospital/corporate/hospital_CorporateReports'))
const Store_Dashboard = lazy(() => import('./pages/hospital/store_Dashboard'))
const Store_Suppliers = lazy(() => import('./pages/hospital/store_Suppliers'))
const Store_PurchaseList = lazy(() => import('./pages/hospital/store_PurchaseHistory'))
const Store_AddPurchase = lazy(() => import('./pages/hospital/store_AddPurchase'))
const Store_Inventory = lazy(() => import('./pages/hospital/store_Inventory'))
const Store_IssueHistory = lazy(() => import('./pages/hospital/store_IssueHistory'))
const Store_PurchaseOrders = lazy(() => import('./pages/hospital/store_PurchaseOrders'))
const Store_Reports = lazy(() => import('./pages/hospital/store_Reports'))
const Ambulance_Dashboard = lazy(() => import('./pages/hospital/ambulance_Dashboard'))
const Ambulance_Master = lazy(() => import('./pages/hospital/ambulance_Master'))
const Ambulance_Trips = lazy(() => import('./pages/hospital/ambulance_Trips'))
const Ambulance_Fuel = lazy(() => import('./pages/hospital/ambulance_Fuel'))
const Ambulance_Expenses = lazy(() => import('./pages/hospital/ambulance_Expenses'))
const Ambulance_Reports = lazy(() => import('./pages/hospital/ambulance_Reports'))
const Hospital_FbrDashboard = lazy(() => import('./pages/hospital/fbr/Hospital_FbrDashboard'))
const Hospital_FbrSettings = lazy(() => import('./pages/hospital/fbr/Hospital_FbrSettings'))
const Hospital_FbrLogs = lazy(() => import('./pages/hospital/fbr/Hospital_FbrLogs'))
const Hospital_FbrReports = lazy(() => import('./pages/hospital/fbr/Hospital_FbrReports'))
const Hospital_FbrCredentials = lazy(() => import('./pages/hospital/fbr/Hospital_FbrCredentials'))
const Doctor_Layout = lazy(() => import('./pages/doctor/doctor_Layout'))
const Doctor_Dashboard = lazy(() => import('./pages/doctor/doctor_Dashboard'))
const Doctor_Patients = lazy(() => import('./pages/doctor/doctor_Patients'))
const Doctor_Prescription = lazy(() => import('./pages/doctor/doctor_Prescription'))
const Doctor_PrescriptionHistory = lazy(() => import('./pages/doctor/doctor_PrescriptionHistory'))
const Doctor_PrescriptionTemplates = lazy(() => import('./pages/doctor/doctor_PrescriptionTemplates'))
const Doctor_Notifications = lazy(() => import('./pages/doctor/doctor_Notifications'))
const Doctor_Reports = lazy(() => import('./pages/doctor/doctor_Reports_new'))
const Doctor_Referrals = lazy(() => import('./pages/doctor/doctor_Referrals'))
const Doctor_Settings = lazy(() => import('./pages/doctor/doctor_Settings'))
const Lab_Layout = lazy(() => import('./pages/lab/lab_Layout'))
const Lab_Dashboard = lazy(() => import('./pages/lab/lab_Dashboard'))
const Lab_Tests = lazy(() => import('./pages/lab/lab_Tests'))
const Lab_Orders = lazy(() => import('./pages/lab/lab_SampleIntake'))
const Lab_Tracking = lazy(() => import('./pages/lab/lab_Tracking'))
const Lab_Appointments = lazy(() => import('./pages/lab/lab_Appointments'))
const Lab_Results = lazy(() => import('./pages/lab/lab_Results'))
const Lab_Barcodes = lazy(() => import('./pages/lab/lab_Barcodes'))
const Lab_ReportApproval = lazy(() => import('./pages/lab/lab_ReportApproval'))
const Lab_ReportGenerator = lazy(() => import('./pages/lab/lab_ReportGenerator'))
const Lab_Settings = lazy(() => import('./pages/lab/lab_Settings'))
const Lab_IncomeLedger = lazy(() => import('./pages/lab/lab_IncomeLedger'))
const Lab_Inventory = lazy(() => import('./pages/lab/lab_Inventory'))
const Lab_AddInvoicePage = lazy(() => import('./components/lab/lab_AddInvoicePage'))
const Lab_Suppliers = lazy(() => import('./pages/lab/lab_Suppliers.tsx'))
const Lab_Companies = lazy(() => import('./pages/lab/lab_Companies'))
const Lab_SupplierReturns = lazy(() => import('./pages/lab/lab_SupplierReturns.tsx'))
const Lab_PurchaseHistory = lazy(() => import('./pages/lab/lab_PurchaseHistory.tsx'))
const Lab_PurchaseOrders = lazy(() => import('./pages/lab/lab_PurchaseOrders.tsx'))
const Lab_ReturnHistory = lazy(() => import('./pages/lab/lab_ReturnHistory.tsx'))
const Lab_UserManagement = lazy(() => import('./pages/lab/lab_UserManagement'))
const Lab_SidebarPermissions = lazy(() => import('./pages/lab/lab_SidebarPermissions'))
const Lab_Expenses = lazy(() => import('./pages/lab/lab_Expenses'))
const Lab_AuditLogs = lazy(() => import('./pages/lab/lab_AuditLogs'))
const Lab_Reports = lazy(() => import('./pages/lab/lab_Reports'))
const Lab_StaffAttendance = lazy(() => import('./pages/lab/lab_StaffAttendance'))
const Lab_StaffManagement = lazy(() => import('./pages/lab/lab_StaffManagement'))
const Lab_StaffSettings = lazy(() => import('./pages/lab/lab_StaffSettings'))
const Lab_StaffMonthly = lazy(() => import('./pages/lab/lab_StaffMonthly'))
const Lab_Referrals = lazy(() => import('./pages/lab/lab_Referrals'))
const Lab_PayInOut = lazy(() => import('./pages/lab/lab_PayInOut'))
const Lab_ManagerCashCount = lazy(() => import('./pages/lab/lab_ManagerCashCount'))
const Lab_BB_Donors = lazy(() => import('./pages/lab/bloodbank/Lab_BB_Donors'))
const Lab_BB_Inventory = lazy(() => import('./pages/lab/bloodbank/Lab_BB_Inventory'))
const Lab_BB_Receivers = lazy(() => import('./pages/lab/bloodbank/Lab_BB_Receivers'))
const Lab_TodaysTokens = lazy(() => import('./pages/lab/lab_TodaysTokens'))
const Lab_CollectionCenters = lazy(() => import('./pages/lab/lab_CollectionCenters'))
const Lab_CollectionCenterRevenue = lazy(() => import('./pages/lab/lab_CollectionCenterRevenue'))
const Lab_CollectionCenterPayments = lazy(() => import('./pages/lab/lab_CollectionCenterPayments'))
const Lab_CenterRateList = lazy(() => import('./pages/lab/lab_CenterRateList'))
const Lab_CriticalValues = lazy(() => import('./pages/lab/lab_CriticalValues'))
const Lab_DailyWorksheet = lazy(() => import('./pages/lab/lab_DailyWorksheet'))
const Lab_MainRegister = lazy(() => import('./pages/lab/lab_MainRegister'))
const Lab_OutsourceDispatch = lazy(() => import('./pages/lab/lab_OutsourceDispatch'))
const Lab_OutsourceLabs = lazy(() => import('./pages/lab/lab_OutsourceLabs'))
const Lab_OutsourceRateList = lazy(() => import('./pages/lab/lab_OutsourceRateList'))
const Lab_PatientCards = lazy(() => import('./pages/lab/lab_PatientCards'))
const Lab_TAT = lazy(() => import('./pages/lab/lab_TAT'))
const Lab_TestPackages = lazy(() => import('./pages/lab/lab_TestPackages'))
const Lab_TotalTests = lazy(() => import('./pages/lab/lab_TotalTests'))
const Lab_WardImports = lazy(() => import('./pages/lab/lab_WardImports'))
const Lab_DoctorRevenue = lazy(() => import('./pages/lab/lab_DoctorRevenue'))
const Finance_Transactions = lazy(() => import('./pages/hospital/hospital_Transactions.tsx'))
const Finance_ExpenseHistory = lazy(() => import('./pages/hospital/hospital_ExpenseHistory.tsx'))
const Finance_Layout = lazy(() => import('./pages/finance/finance_Layout.tsx'))
const Finance_Dashboard = lazy(() => import('./pages/finance/finance_Dashboard'))
const Finance_UserManagement = lazy(() => import('./pages/finance/finance_UserManagement'))
const Finance_SidebarPermissions = lazy(() => import('./pages/finance/finance_SidebarPermissions'))
const Finance_AuditLogs = lazy(() => import('./pages/finance/finance_AuditLogs'))
const Finance_ChartOfAccounts = lazy(() => import('./pages/finance/finance_ChartOfAccounts'))
const Finance_AccountLedger = lazy(() => import('./pages/finance/finance_AccountLedger'))
const Finance_AllAccountsLedger = lazy(() => import('./pages/finance/finance_AllAccountsLedger'))
const Finance_VoucherList = lazy(() => import('./pages/finance/finance_VoucherList'))
const Finance_VoucherForm = lazy(() => import('./pages/finance/finance_VoucherForm'))
const Finance_TrialBalance = lazy(() => import('./pages/finance/finance_TrialBalance'))
const Finance_ProfitLoss = lazy(() => import('./pages/finance/finance_ProfitLoss'))
const Finance_BalanceSheet = lazy(() => import('./pages/finance/finance_BalanceSheet'))
const Finance_CashFlow = lazy(() => import('./pages/finance/finance_CashFlow'))
const Finance_RecurringVouchers = lazy(() => import('./pages/finance/finance_RecurringVouchers'))
const Finance_FiscalPeriods = lazy(() => import('./pages/finance/finance_FiscalPeriods'))
const Finance_Budgets = lazy(() => import('./pages/finance/finance_Budgets'))
const Finance_BankReconciliation = lazy(() => import('./pages/finance/finance_BankReconciliation'))
const Finance_ApprovalQueue = lazy(() => import('./pages/finance/finance_ApprovalQueue'))
const Finance_VoucherPrint = lazy(() => import('./pages/finance/finance_VoucherPrint'))
const Finance_ShiftReports = lazy(() => import('./pages/finance/finance_ShiftReports'))
const Finance_ShiftSettings = lazy(() => import('./pages/finance/finance_ShiftSettings'))
const Finance_ExpenseApprovals = lazy(() => import('./pages/finance/finance_ExpenseApprovals'))
const Finance_ActivityLog = lazy(() => import('./pages/finance/finance_ActivityLog'))
const Hospital_DoctorPayouts = lazy(() => import('./pages/hospital/hospital_DoctorPayouts'))
const Hospital_CashSessions = lazy(() => import('./pages/hospital/hospital_CashSessions'))
const Pharmacy_Layout = lazy(() => import('./pages/pharmacy/pharmacy_Layout'))
const Pharmacy_Dashboard = lazy(() => import('./pages/pharmacy/pharmacy_Dashboard'))
const Pharmacy_POS = lazy(() => import('./pages/pharmacy/pharmacy_POS'))
const Pharmacy_Prescriptions = lazy(() => import('./pages/pharmacy/pharmacy_Prescriptions'))
const Pharmacy_PrescriptionIntake = lazy(() => import('./pages/pharmacy/pharmacy_PrescriptionIntake'))
const Pharmacy_Referrals = lazy(() => import('./pages/pharmacy/pharmacy_Referrals'))
const Pharmacy_Inventory = lazy(() => import('./pages/pharmacy/pharmacy_Inventory'))
const Pharmacy_AddInvoicePage = lazy(() => import('./components/pharmacy/pharmacy_AddInvoicePage'))
const Pharmacy_Customers = lazy(() => import('./pages/pharmacy/pharmacy_Customers'))
const Pharmacy_Suppliers = lazy(() => import('./pages/pharmacy/pharmacy_Suppliers'))
const Pharmacy_Companies = lazy(() => import('./pages/pharmacy/pharmacy_Companies'))
const Pharmacy_Settings = lazy(() => import('./pages/pharmacy/pharmacy_Settings'))
const Pharmacy_PayInOut = lazy(() => import('./pages/pharmacy/pharmacy_PayInOut'))
const Pharmacy_ManagerCashCount = lazy(() => import('./pages/pharmacy/pharmacy_ManagerCashCount'))
const Pharmacy_SalesHistory = lazy(() => import('./pages/pharmacy/pharmacy_SalesHistory'))
const Pharmacy_PurchaseHistory = lazy(() => import('./pages/pharmacy/pharmacy_PurchaseHistory'))
const Pharmacy_ReturnHistory = lazy(() => import('./pages/pharmacy/pharmacy_ReturnHistory'))
const Pharmacy_Reports = lazy(() => import('./pages/pharmacy/pharmacy_Reports'))
const Pharmacy_UserManagement = lazy(() => import('./pages/pharmacy/pharmacy_UserManagement'))
const Pharmacy_Notifications = lazy(() => import('./pages/pharmacy/pharmacy_Notifications'))
const Pharmacy_AuditLogs = lazy(() => import('./pages/pharmacy/pharmacy_AuditLogs'))
const Pharmacy_Expenses = lazy(() => import('./pages/pharmacy/pharmacy_Expenses'))
const Pharmacy_CustomerReturns = lazy(() => import('./pages/pharmacy/pharmacy_CustomerReturns'))
const Pharmacy_SupplierReturns = lazy(() => import('./pages/pharmacy/pharmacy_SupplierReturns'))
const Pharmacy_Guidelines = lazy(() => import('./pages/pharmacy/pharmacy_Guidelines'))
const Pharmacy_PurchaseOrders = lazy(() => import('./pages/pharmacy/pharmacy_PurchaseOrdersPage'))
const Pharmacy_CreatePurchaseOrder = lazy(() => import('./pages/pharmacy/pharmacy_CreatePurchaseOrder'))
const Pharmacy_StaffAttendance = lazy(() => import('./pages/pharmacy/pharmacy_StaffAttendance'))
const Pharmacy_StaffManagement = lazy(() => import('./pages/pharmacy/pharmacy_StaffManagement'))
const Pharmacy_StaffSettings = lazy(() => import('./pages/pharmacy/pharmacy_StaffSettings'))
const Pharmacy_StaffMonthly = lazy(() => import('./pages/pharmacy/pharmacy_StaffMonthly'))
const Pharmacy_SidebarPermissions = lazy(() => import('./pages/pharmacy/pharmacy_SidebarPermissions'))
const IndoorPharmacy_Layout = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_Layout'))
const IndoorPharmacy_Dashboard = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_Dashboard'))
const IndoorPharmacy_POS = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_POS'))
const IndoorPharmacy_Prescriptions = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_Prescriptions'))
const IndoorPharmacy_PrescriptionIntake = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_PrescriptionIntake'))
const IndoorPharmacy_Referrals = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_Referrals'))
const IndoorPharmacy_Inventory = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_Inventory'))
const IndoorPharmacy_AddInvoicePage = lazy(() => import('./components/indoorpharmacy/indoorpharmacy_AddInvoicePage'))
const IndoorPharmacy_Customers = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_Customers'))
const IndoorPharmacy_Suppliers = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_Suppliers'))
const IndoorPharmacy_Companies = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_Companies'))
const IndoorPharmacy_Settings = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_Settings'))
const IndoorPharmacy_PayInOut = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_PayInOut'))
const IndoorPharmacy_ManagerCashCount = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_ManagerCashCount'))
const IndoorPharmacy_SalesHistory = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_SalesHistory'))
const IndoorPharmacy_PurchaseHistory = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_PurchaseHistory'))
const IndoorPharmacy_ReturnHistory = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_ReturnHistory'))
const IndoorPharmacy_Reports = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_Reports'))
const IndoorPharmacy_UserManagement = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_UserManagement'))
const IndoorPharmacy_Notifications = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_Notifications'))
const IndoorPharmacy_AuditLogs = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_AuditLogs'))
const IndoorPharmacy_Expenses = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_Expenses'))
const IndoorPharmacy_CustomerReturns = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_CustomerReturns'))
const IndoorPharmacy_SupplierReturns = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_SupplierReturns'))
const IndoorPharmacy_Guidelines = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_Guidelines'))
const IndoorPharmacy_PurchaseOrders = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_PurchaseOrders'))
const IndoorPharmacy_SidebarPermissions = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_SidebarPermissions'))
const IndoorPharmacy_Shifts = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_Shifts'))
const IndoorPharmacy_IntegrationDashboard = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_IntegrationDashboard'))
const IndoorPharmacy_OrderQueue = lazy(() => import('./pages/indoorpharmacy/indoorpharmacy_OrderQueue'))
const Diagnostic_Layout = lazy(() => import('./pages/diagnostic/diagnostic_Layout'))
const Diagnostic_Dashboard = lazy(() => import('./pages/diagnostic/diagnostic_Dashboard'))
const Diagnostic_TokenGenerator = lazy(() => import('./pages/diagnostic/diagnostic_TokenGenerator'))
const Diagnostic_TokenHistory = lazy(() => import('./pages/diagnostic/diagnostic_TokenHistory'))
const Diagnostic_Tests = lazy(() => import('./pages/diagnostic/diagnostic_Tests'))
const Diagnostic_SampleTracking = lazy(() => import('./pages/diagnostic/Diagnostic_SampleTracking_Impl'))
const Diagnostic_ResultEntry = lazy(() => import('./pages/diagnostic/diagnostic_ResultEntry'))
const Diagnostic_ReportGenerator = lazy(() => import('./pages/diagnostic/diagnostic_ReportGenerator'))
const Diagnostic_AuditLogs = lazy(() => import('./pages/diagnostic/diagnostic_AuditLogs'))
const Diagnostic_Settings = lazy(() => import('./pages/diagnostic/diagnostic_Settings'))
const Diagnostic_UserManagement = lazy(() => import('./pages/diagnostic/diagnostic_UserManagement'))
const Diagnostic_SidebarPermissions = lazy(() => import('./pages/diagnostic/diagnostic_SidebarPermissions'))
const Diagnostic_Referrals = lazy(() => import('./pages/diagnostic/diagnostic_Referrals'))
const Diagnostic_IncomeLedger = lazy(() => import('./pages/diagnostic/diagnostic_IncomeLedger'))
const Reception_Layout = lazy(() => import('./pages/reception/reception_Layout.tsx'))
const Reception_Dashboard = lazy(() => import('./pages/reception/reception_Dashboard'))
const Hospital_IPDBillingCollect = lazy(() => import('./pages/hospital/hospital_IPDBillingCollect'))
const Hospital_IPDTransactions = lazy(() => import('./pages/hospital/hospital_IPDTransactions'))
const Hospital_ERTransactions = lazy(() => import('./pages/hospital/hospital_ERTransactions'))
const Hospital_ERBillingCollect = lazy(() => import('./pages/hospital/hospital_ERBillingCollect'))
const Reception_UserManagement = lazy(() => import('./pages/reception/reception_UserManagement'))
const Reception_StaffSettings = lazy(() => import('./pages/reception/reception_StaffSettings'))
const Reception_SidebarPermissions = lazy(() => import('./pages/reception/reception_SidebarPermissions'))
const Reception_MyActivityReport = lazy(() => import('./pages/reception/reception_MyActivityReport'))
const Reception_PayInOut = lazy(() => import('./pages/reception/reception_PayInOut'))
const Dialysis_Layout = lazy(() => import('./pages/dialysis/dialysis_Layout'))
const Dialysis_Dashboard = lazy(() => import('./pages/dialysis/dialysis_Dashboard'))
const Dialysis_TokenGenerator = lazy(() => import('./pages/dialysis/dialysis_TokenGenerator'))
const Dialysis_TokenHistory = lazy(() => import('./pages/dialysis/dialysis_TokenHistory'))
const Dialysis_Patients = lazy(() => import('./pages/dialysis/dialysis_Patients'))
const Dialysis_Discharged = lazy(() => import('./pages/dialysis/dialysis_Discharged'))
const Dialysis_Sessions = lazy(() => import('./pages/dialysis/dialysis_Sessions'))
const Dialysis_Appointments = lazy(() => import('./pages/dialysis/dialysis_Appointments'))
const Dialysis_UserManagement = lazy(() => import('./pages/dialysis/dialysis_UserManagement'))
const Dialysis_SidebarPermissions = lazy(() => import('./pages/dialysis/dialysis_SidebarPermissions'))
const Dialysis_AuditLogs = lazy(() => import('./pages/dialysis/dialysis_AuditLogs'))
const Dialysis_Settings = lazy(() => import('./pages/dialysis/dialysis_Settings'))
const Dialysis_MasterData = lazy(() => import('./pages/dialysis/dialysis_MasterData'))

// Camp
const Camp_Layout = lazy(() => import('./pages/camp/camp_Layout'))
const Camp_Dashboard = lazy(() => import('./pages/camp/camp_Dashboard'))
const Camp_Schedule = lazy(() => import('./pages/camp/camp_Schedule'))
const Camp_Patients = lazy(() => import('./pages/camp/camp_Patients'))
const Camp_Consultations = lazy(() => import('./pages/camp/camp_Consultations'))
const Camp_Prescriptions = lazy(() => import('./pages/camp/camp_Prescriptions'))
const Camp_LabOrders = lazy(() => import('./pages/camp/camp_LabOrders'))
const Camp_Diagnostics = lazy(() => import('./pages/camp/camp_Diagnostics'))
const Camp_Dispensing = lazy(() => import('./pages/camp/camp_Dispensing'))
const Camp_Staff = lazy(() => import('./pages/camp/camp_Staff'))
const Camp_Reports = lazy(() => import('./pages/camp/camp_Reports'))
const Camp_Settings = lazy(() => import('./pages/camp/camp_Settings'))
const Camp_UserManagement = lazy(() => import('./pages/camp/camp_UserManagement'))
const Camp_SidebarPermissions = lazy(() => import('./pages/camp/camp_SidebarPermissions'))

const Aesthetic_Layout = lazy(() => import('./pages/aesthetic/aesthetic_Layout'))
const Aesthetic_Dashboard = lazy(() => import('./pages/aesthetic/aesthetic_Dashboard'))
const Aesthetic_TokenGeneratorPage = lazy(() => import('./pages/aesthetic/aesthetic_TokenGenerator'))
const Aesthetic_TodayTokens = lazy(() => import('./pages/aesthetic/aesthetic_TodayTokens'))
const Aesthetic_TokenHistoryPage = lazy(() => import('./pages/aesthetic/aesthetic_TokenHistory'))
const Aesthetic_ReportsPage = lazy(() => import('./pages/aesthetic/aesthetic_Reports'))
const Aesthetic_InventoryPage = lazy(() => import('./pages/aesthetic/aesthetic_Inventory'))
const Aesthetic_AddInvoicePage = lazy(() => import('./components/aesthetic/aesthetic_AddInvoicePage'))
const Aesthetic_ReturnHistory = lazy(() => import('./pages/aesthetic/aesthetic_ReturnHistory'))
const Aesthetic_SuppliersPage = lazy(() => import('./pages/aesthetic/aesthetic_Suppliers'))
const Aesthetic_Patients = lazy(() => import('./pages/aesthetic/aesthetic_Patients'))
const Aesthetic_PatientProfile = lazy(() => import('./pages/aesthetic/aesthetic_PatientProfile'))
const Aesthetic_ExpensesPage = lazy(() => import('./pages/aesthetic/aesthetic_Expenses'))
const Aesthetic_DoctorManagementPage = lazy(() => import('./pages/aesthetic/aesthetic_DoctorManagement'))
const Aesthetic_AuditLogsPage = lazy(() => import('./pages/aesthetic/aesthetic_AuditLogs'))
const Aesthetic_UserManagementPage = lazy(() => import('./pages/aesthetic/aesthetic_UserManagement'))
const Aesthetic_Notifications = lazy(() => import('./pages/aesthetic/aesthetic_Notifications'))
const Aesthetic_StaffAttendance = lazy(() => import('./pages/aesthetic/aesthetic_StaffAttendance'))
const Aesthetic_StaffManagement = lazy(() => import('./pages/aesthetic/aesthetic_StaffManagement'))
const Aesthetic_StaffSettings = lazy(() => import('./pages/aesthetic/aesthetic_StaffSettings'))
const Aesthetic_StaffMonthly = lazy(() => import('./pages/aesthetic/aesthetic_StaffMonthly'))
const Aesthetic_StaffDashboard = lazy(() => import('./pages/aesthetic/aesthetic_StaffDashboard'))
const Aesthetic_SupplierReturns = lazy(() => import('./pages/aesthetic/aesthetic_SupplierReturns'))
const Aesthetic_PurchaseHistory = lazy(() => import('./pages/aesthetic/aesthetic_PurchaseHistory'))
const Aesthetic_Settings = lazy(() => import('./pages/aesthetic/aesthetic_Settings'))
const Aesthetic_ConsentTemplates = lazy(() => import('./pages/aesthetic/aesthetic_ConsentTemplates'))
const Aesthetic_ProcedureCatalog = lazy(() => import('./pages/aesthetic/aesthetic_ProcedureCatalog'))
const Aesthetic_DoctorFinance = lazy(() => import('./pages/aesthetic/aesthetic_DoctorFinance'))
const Aesthetic_DoctorPayouts = lazy(() => import('./pages/aesthetic/aesthetic_DoctorPayouts'))
const Aesthetic_DoctorSchedules = lazy(() => import('./pages/aesthetic/aesthetic_DoctorSchedules'))
const Aesthetic_Appointments = lazy(() => import('./pages/aesthetic/aesthetic_Appointments'))
const Aesthetic_SidebarPermissions = lazy(() => import('./pages/aesthetic/aesthetic_SidebarPermissions'))
const Hospital_OTDashboard = lazy(() => import('./pages/hospital/hospital_OTDashboard'))
const Hospital_ICUDashboard = lazy(() => import('./pages/hospital/hospital_ICUDashboard'))
// Nurse Portal
const Hospital_NurseLogin = lazy(() => import('./pages/hospital/hospital_NurseLogin.tsx'))
const Hospital_NurseDashboard = lazy(() => import('./pages/hospital/hospital_NurseDashboard.tsx'))
const Hospital_NurseTasks = lazy(() => import('./pages/hospital/hospital_NurseTasks.tsx'))
const Hospital_NurseTaskDetail = lazy(() => import('./pages/hospital/hospital_NurseTaskDetail.tsx'))
const Hospital_NursePatients = lazy(() => import('./pages/hospital/hospital_NursePatients.tsx'))
const Hospital_NurseVitals = lazy(() => import('./pages/hospital/hospital_NurseVitals.tsx'))
const Hospital_NurseShifts = lazy(() => import('./pages/hospital/hospital_NurseShifts.tsx'))
const Hospital_NurseHandover = lazy(() => import('./pages/hospital/hospital_NurseHandover.tsx'))
const Hospital_NursePerformance = lazy(() => import('./pages/hospital/hospital_NursePerformance.tsx'))
const Hospital_NurseAdminDashboard = lazy(() => import('./pages/hospital/hospital_NurseAdminDashboard.tsx'))
// OT Sub-pages
const OT_Schedule = lazy(() => import('./pages/hospital/ot/ot_Schedule'))
const OT_Rooms = lazy(() => import('./pages/hospital/ot/ot_Rooms'))
const OT_Team = lazy(() => import('./pages/hospital/ot/ot_Team'))
const OT_Sterilization = lazy(() => import('./pages/hospital/ot/ot_Sterilization'))
const OT_Equipment = lazy(() => import('./pages/hospital/ot/ot_Equipment'))
const OT_Reports = lazy(() => import('./pages/hospital/ot/ot_Reports'))
const OT_Procedures = lazy(() => import('./pages/hospital/ot/ot_Procedures'))
const OT_CompletedSurgeries = lazy(() => import('./pages/hospital/ot/ot_CompletedSurgeries'))
// ICU Sub-pages
const ICU_Beds = lazy(() => import('./pages/hospital/icu/icu_Beds'))
const ICU_Monitoring = lazy(() => import('./pages/hospital/icu/icu_Monitoring'))
const ICU_Scoring = lazy(() => import('./pages/hospital/icu/icu_Scoring'))
const ICU_Ventilator = lazy(() => import('./pages/hospital/icu/icu_Ventilator'))
const ICU_Reports = lazy(() => import('./pages/hospital/icu/icu_Reports'))
const ICU_Transfer = lazy(() => import('./pages/hospital/icu/icu_Transfer'))
const ICU_Referrals = lazy(() => import('./pages/hospital/icu/icu_Referrals'))
// OT / ICU Patient List & Billing
const Hospital_OTPatients = lazy(() => import('./pages/hospital/hospital_OTPatients'))
const Hospital_OTBilling = lazy(() => import('./pages/hospital/hospital_OTBilling'))
const Hospital_ICUPatients = lazy(() => import('./pages/hospital/hospital_ICUPatients'))
const Hospital_ICUBilling = lazy(() => import('./pages/hospital/hospital_ICUBilling'))

// Loading fallback component — 3D eye-catching preloader
const LoadingFallback = () => {
  const CACHE_KEY = 'app.hospital.name'
  const [hospitalName, setHospitalName] = useState<string>(
    () => {
      try { return localStorage.getItem(CACHE_KEY) || '' } catch { return '' }
    }
  )
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { hospitalApi } = await import('./utils/api')
        const s: any = await hospitalApi.getSettings()
        const name: string = s?.name || s?.hospitalName || ''
        if (!cancelled && name) {
          setHospitalName(name)
          try { localStorage.setItem(CACHE_KEY, name) } catch {}
        }
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])
  return (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
    overflow: 'hidden', position: 'relative',
  }}>
    <style>{`
      @keyframes spin3d { 0%{transform:rotateX(0deg) rotateY(0deg)} 100%{transform:rotateX(360deg) rotateY(360deg)} }
      @keyframes ring1  { 0%{transform:rotateZ(0deg) rotateX(65deg)}  100%{transform:rotateZ(360deg) rotateX(65deg)} }
      @keyframes ring2  { 0%{transform:rotateZ(0deg) rotateY(65deg)}  100%{transform:rotateZ(-360deg) rotateY(65deg)} }
      @keyframes ring3  { 0%{transform:rotateZ(120deg) rotateX(65deg)} 100%{transform:rotateZ(480deg) rotateX(65deg)} }
      @keyframes pulse3d { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.15);opacity:0.8} }
      @keyframes floatUp { 0%{transform:translateY(0) scale(1);opacity:0.6} 100%{transform:translateY(-120px) scale(0);opacity:0} }
      @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
      @keyframes fadeInUp { 0%{opacity:0;transform:translateY(20px)} 100%{opacity:1;transform:translateY(0)} }
      .loader-ring { position:absolute; border-radius:50%; border:2px solid transparent; }
      .lr1 { width:160px;height:160px; border-top-color:#818cf8; border-right-color:#818cf8; animation:ring1 1.8s linear infinite; box-shadow:0 0 20px rgba(129,140,248,0.3); }
      .lr2 { width:130px;height:130px; border-top-color:#34d399; border-left-color:#34d399;  animation:ring2 2.2s linear infinite; box-shadow:0 0 20px rgba(52,211,153,0.3); }
      .lr3 { width:100px;height:100px; border-bottom-color:#f472b6; border-right-color:#f472b6; animation:ring3 1.5s linear infinite; box-shadow:0 0 20px rgba(244,114,182,0.3); }
      .loader-core { width:70px;height:70px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:50%;display:flex;align-items:center;justify-content:center;animation:pulse3d 2s ease-in-out infinite;box-shadow:0 0 40px rgba(99,102,241,0.6),0 0 80px rgba(99,102,241,0.3); }
      .particle { position:absolute; width:4px;height:4px;border-radius:50%; animation:floatUp 3s ease-in infinite; }
      .loader-text { background:linear-gradient(90deg,#818cf8,#34d399,#f472b6,#818cf8);background-size:200% auto;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 2s linear infinite; }
    `}</style>

    {/* Floating particles */}
    {[...Array(12)].map((_, i) => (
      <div key={i} className="particle" style={{
        left: `${10 + (i * 7.5)}%`, bottom: '15%',
        background: ['#818cf8','#34d399','#f472b6','#fbbf24','#60a5fa'][i % 5],
        animationDelay: `${i * 0.25}s`, animationDuration: `${2.5 + (i % 3) * 0.5}s`,
        width: i % 3 === 0 ? '6px' : '4px', height: i % 3 === 0 ? '6px' : '4px',
      }} />
    ))}

    {/* 3D Orbit rings */}
    <div style={{ position: 'relative', width: '160px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: '800px' }}>
      <div className="loader-ring lr1" />
      <div className="loader-ring lr2" />
      <div className="loader-ring lr3" />
      {/* Core */}
      <div className="loader-core">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5z" fill="rgba(255,255,255,0.9)" />
          <path d="M2 17l10 5 10-5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none" />
          <path d="M2 12l10 5 10-5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none" />
        </svg>
      </div>
    </div>

    {/* Text */}
    <div style={{ marginTop: '40px', textAlign: 'center', animation: 'fadeInUp 0.8s ease-out forwards' }}>
      <div className="loader-text" style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '0.1em', fontFamily: 'system-ui, sans-serif' }}>
        {hospitalName || 'LOADING…'}
      </div>
      <div style={{ color: '#475569', fontSize: '11px', fontWeight: 600, letterSpacing: '0.3em', marginTop: '6px', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif' }}>
        Hospital Information System
      </div>
      {/* Dots loader */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '20px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '7px', height: '7px', borderRadius: '50%', background: '#6366f1',
            animation: 'pulse3d 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
            boxShadow: '0 0 8px rgba(99,102,241,0.6)',
          }} />
        ))}
      </div>
    </div>

    {/* Corner glows */}
    <div style={{ position:'absolute', top:'-100px', right:'-100px', width:'300px', height:'300px', borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,0.15) 0%,transparent 70%)', pointerEvents:'none' }} />
    <div style={{ position:'absolute', bottom:'-80px', left:'-80px', width:'250px', height:'250px', borderRadius:'50%', background:'radial-gradient(circle,rgba(52,211,153,0.1) 0%,transparent 70%)', pointerEvents:'none' }} />
  </div>
  )
}

export default function App() {
  const navigate = useNavigate()

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault()
        navigate('/super-admin/login')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  return (
    <Suspense fallback={<LoadingFallback />}>
      <GlobalToast />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/hospital/login" element={<Hospital_Login />} />
        <Route path="/hospital/nurse/login" element={<Hospital_NurseLogin />} />
        <Route path="/aesthetic/login" element={<Aesthetic_Login />} />
        <Route path="/hospital" element={<Hospital_Layout />}>
          <Route index element={<Hospital_Dashboard />} />
          <Route path="today-tokens" element={<Hospital_TodayTokens />} />
          <Route path="token-history" element={<Hospital_TokenHistory />} />
          <Route path="my-activity-report" element={<Hospital_MyActivityReport />} />
          <Route path="token-generator" element={<Hospital_TokenGenerator />} />
          <Route path="emergency" element={<Hospital_EmergencyQueue />} />
        <Route path="er-discharged" element={<Hospital_ErDischarged />} />
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
        <Route path="er-beds" element={<Hospital_ERBeds />} />
        <Route path="patient-list" element={<Hospital_PatientList />} />
        <Route path="patient/:id" element={<Hospital_PatientProfile />} />
        <Route path="ipd-referrals" element={<Hospital_IPDReferrals />} />
        <Route path="er-referrals" element={<Hospital_ERReferrals />} />
        <Route path="ipd-services" element={<Hospital_IPDServices />} />
        <Route path="ipd-services/add" element={<Hospital_IPDServiceAdd />} />
        <Route path="discharge/:id" element={<Hospital_DischargeForms />} />
        <Route path="discharged" element={<Hospital_Discharged />} />
        <Route path="staff-attendance" element={<Hospital_StaffAttendance />} />
        <Route path="staff-leaves" element={<Hospital_StaffLeaves />} />
        <Route path="staff-dashboard" element={<Hospital_StaffDashboard />} />
        <Route path="staff-management" element={<Hospital_StaffManagement />} />
        <Route path="staff-settings" element={<Hospital_StaffSettings />} />
        <Route path="biometric-settings" element={<Hospital_BiometricSettings />} />
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
        <Route path="patients" element={<Hospital_Patients />} />
        <Route path="doctors" element={<Hospital_Doctors />} />
        <Route path="doctor-schedules" element={<Hospital_DoctorSchedules />} />
        <Route path="appointments" element={<Hospital_Appointments />} />
        <Route path="forms/received-deaths" element={<Hospital_ReceivedDeathList />} />
        <Route path="forms/death-certificates" element={<Hospital_DeathCertificateList />} />
        <Route path="forms/birth-certificates" element={<Hospital_BirthCertificateList />} />
        <Route path="forms/short-stays" element={<Hospital_ShortStayList />} />
        <Route path="forms/discharge-summaries" element={<Hospital_DischargeSummaryList />} />
        <Route path="forms/invoices" element={<Hospital_InvoiceList />} />
        <Route path="ipd/admissions/:id/forms/received-death" element={<Hospital_ReceivedDeathDetail />} />
        <Route path="ipd/admissions/:id/forms/death-certificate" element={<Hospital_DeathCertificateDetail />} />
        <Route path="forms/birth-certificates/:id" element={<Hospital_BirthCertificateDetail />} />
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
        {/* OT Module */}
        <Route path="ot" element={<Hospital_OTDashboard />} />
        <Route path="ot/schedule" element={<OT_Schedule />} />
        <Route path="ot/rooms" element={<OT_Rooms />} />
        <Route path="ot/team" element={<OT_Team />} />
        <Route path="ot/sterilization" element={<OT_Sterilization />} />
        <Route path="ot/equipment" element={<OT_Equipment />} />
        <Route path="ot/reports" element={<OT_Reports />} />
        <Route path="ot/procedures" element={<OT_Procedures />} />
        <Route path="ot/completed" element={<OT_CompletedSurgeries />} />
        <Route path="ot/patients" element={<Hospital_OTPatients />} />
        <Route path="ot/billing" element={<Hospital_OTBilling />} />
        {/* ICU Module */}
        <Route path="icu" element={<Hospital_ICUDashboard />} />
        <Route path="icu/beds" element={<ICU_Beds />} />
        <Route path="icu/monitoring" element={<ICU_Monitoring />} />
        <Route path="icu/scoring" element={<ICU_Scoring />} />
        <Route path="icu/ventilator" element={<ICU_Ventilator />} />
        <Route path="icu/reports" element={<ICU_Reports />} />
        <Route path="icu/referrals" element={<ICU_Referrals />} />
        <Route path="icu/transfer/:id" element={<ICU_Transfer />} />
        <Route path="icu/patients" element={<Hospital_ICUPatients />} />
        <Route path="icu/billing" element={<Hospital_ICUBilling />} />
        {/* Nurse Portal */}
        <Route path="nurse/dashboard" element={<Hospital_NurseDashboard />} />
        <Route path="nurse/tasks" element={<Hospital_NurseTasks />} />
        <Route path="nurse/tasks/:id" element={<Hospital_NurseTaskDetail />} />
        <Route path="nurse/patients" element={<Hospital_NursePatients />} />
        <Route path="nurse/vitals" element={<Hospital_NurseVitals />} />
        <Route path="nurse/shifts" element={<Hospital_NurseShifts />} />
        <Route path="nurse/handover" element={<Hospital_NurseHandover />} />
        <Route path="nurse/performance" element={<Hospital_NursePerformance />} />
        <Route path="nurse-admin/dashboard" element={<Hospital_NurseAdminDashboard />} />
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
      </Route>
      <Route path="/diagnostic/login" element={<Diagnostic_Login />} />
      <Route path="/diagnostic" element={<Diagnostic_Layout />}>
        <Route index element={<Diagnostic_Dashboard />} />
        <Route path="token-generator" element={<Diagnostic_TokenGenerator />} />
        <Route path="token-history" element={<Diagnostic_TokenHistory />} />
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
      </Route>
      <Route path="/doctor" element={<Doctor_Layout />}>
        <Route index element={<Doctor_Dashboard />} />
        <Route path="patients" element={<Doctor_Patients />} />
        <Route path="ipd-patients" element={<Hospital_PatientList />} />
        <Route path="patient/:id" element={<Hospital_PatientProfile />} />
        <Route path="patient-search" element={<Hospital_SearchPatients />} />
        <Route path="emergency" element={<Hospital_EmergencyQueue />} />
        <Route path="emergency/:id" element={<Hospital_EmergencyChart />} />
        <Route path="emergency/:id/billing" element={<Hospital_ERBillingAdd />} />
        <Route path="emergency-services/add" element={<Hospital_EmergencyServiceAdd />} />
        <Route path="emergency-services" element={<Hospital_EmergencyServices />} />
        <Route path="emergency/:id/services" element={<Hospital_EmergencyServices />} />
        <Route path="prescription" element={<Doctor_Prescription />} />
        <Route path="prescriptions" element={<Doctor_PrescriptionHistory />} />
        <Route path="prescription-history" element={<Doctor_PrescriptionHistory />} />
        <Route path="prescription-templates" element={<Doctor_PrescriptionTemplates />} />
        <Route path="reports" element={<Doctor_Reports />} />
        <Route path="referrals" element={<Doctor_Referrals />} />
        <Route path="notifications" element={<Doctor_Notifications />} />
        <Route path="settings" element={<Doctor_Settings />} />
      </Route>
      <Route path="/lab/login" element={<Lab_Login />} />
      <Route path="/lab" element={<Lab_Layout />}>
        <Route index element={<Lab_Dashboard />} />
        <Route path="today-tokens" element={<Lab_TodaysTokens />} />
        <Route path="orders" element={<Lab_Orders />} />
        <Route path="tracking" element={<Lab_Tracking />} />
        <Route path="barcodes" element={<Lab_Barcodes />} />
        <Route path="appointments" element={<Lab_Appointments />} />
        <Route path="tests" element={<Lab_Tests />} />
        <Route path="results" element={<Lab_Results />} />
        <Route path="referrals" element={<Lab_Referrals />} />
        <Route path="report-approval" element={<Lab_ReportApproval />} />
        <Route path="reports" element={<Lab_ReportGenerator />} />
        <Route path="income-ledger" element={<Lab_IncomeLedger />} />
        <Route path="reports-summary" element={<Lab_Reports />} />
        <Route path="inventory" element={<Lab_Inventory />} />
        <Route path="inventory/add-invoice" element={<Lab_AddInvoicePage />} />
        <Route path="inventory/edit-invoice/:id" element={<Lab_AddInvoicePage />} />
        <Route path="suppliers" element={<Lab_Suppliers />} />
        <Route path="companies" element={<Lab_Companies />} />
        <Route path="supplier-returns" element={<Lab_SupplierReturns />} />
        <Route path="return-history" element={<Lab_ReturnHistory />} />
        <Route path="purchase-orders" element={<Lab_PurchaseOrders />} />
        <Route path="purchase-history" element={<Lab_PurchaseHistory />} />
        <Route path="user-management" element={<Lab_UserManagement />} />
        <Route path="sidebar-permissions" element={<Lab_SidebarPermissions />} />
        <Route path="staff-attendance" element={<Lab_StaffAttendance />} />
        <Route path="staff-management" element={<Lab_StaffManagement />} />
        <Route path="staff-settings" element={<Lab_StaffSettings />} />
        <Route path="staff-monthly" element={<Lab_StaffMonthly />} />
        <Route path="expenses" element={<Lab_Expenses />} />
        <Route path="audit-logs" element={<Lab_AuditLogs />} />
        <Route path="pay-in-out" element={<Lab_PayInOut />} />
        <Route path="manager-cash-count" element={<Lab_ManagerCashCount />} />
        <Route path="settings" element={<Lab_Settings />} />
        {/* Collection Centers */}
        <Route path="collection-centers" element={<Lab_CollectionCenters />} />
        <Route path="center-revenue" element={<Lab_CollectionCenterRevenue />} />
        <Route path="center-payments" element={<Lab_CollectionCenterPayments />} />
        <Route path="doctor-revenue" element={<Lab_DoctorRevenue />} />
        <Route path="center-rate-list" element={<Lab_CenterRateList />} />
        {/* Blood Bank */}
        <Route path="bb/donors" element={<Lab_BB_Donors />} />
        <Route path="bb/inventory" element={<Lab_BB_Inventory />} />
        <Route path="bb/receivers" element={<Lab_BB_Receivers />} />
        {/* New Lab Pages */}
        <Route path="critical-values" element={<Lab_CriticalValues />} />
        <Route path="test-packages" element={<Lab_TestPackages />} />
        <Route path="patient-cards" element={<Lab_PatientCards />} />
        <Route path="ward-imports" element={<Lab_WardImports />} />
        <Route path="outsource-labs" element={<Lab_OutsourceLabs />} />
        <Route path="outsource-rates" element={<Lab_OutsourceRateList />} />
        <Route path="outsource-dispatch" element={<Lab_OutsourceDispatch />} />
        <Route path="total-tests" element={<Lab_TotalTests />} />
        <Route path="tat" element={<Lab_TAT />} />
        <Route path="daily-worksheet" element={<Lab_DailyWorksheet />} />
        <Route path="main-register" element={<Lab_MainRegister />} />
        {/* BB reports-labels and settings routes removed */}
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
        <Route path="purchase-orders/create" element={<Pharmacy_CreatePurchaseOrder />} />
        <Route path="purchase-orders/edit/:id" element={<Pharmacy_CreatePurchaseOrder />} />
        <Route path="settings" element={<Pharmacy_Settings />} />
        <Route path="sidebar-permissions" element={<Pharmacy_SidebarPermissions />} />
        <Route path="user-management" element={<Pharmacy_UserManagement />} />
        <Route path="audit-logs" element={<Pharmacy_AuditLogs />} />
        <Route path="expenses" element={<Pharmacy_Expenses />} />
        <Route path="pay-in-out" element={<Pharmacy_PayInOut />} />
        <Route path="manager-cash-count" element={<Pharmacy_ManagerCashCount />} />
        <Route path="returns" element={<Pharmacy_CustomerReturns />} />
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
        <Route path="integration-dashboard" element={<IndoorPharmacy_IntegrationDashboard />} />
        <Route path="orders" element={<IndoorPharmacy_OrderQueue />} />
      </Route>
      <Route path="/finance/login" element={<Finance_Login />} />
      <Route path="/finance" element={<Finance_Layout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Finance_Dashboard />} />
        <Route path="add-expense" element={<Finance_ExpenseHistory />} />
        <Route path="transactions" element={<Finance_Transactions />} />
        <Route path="expenses" element={<Finance_ExpenseHistory />} />
        <Route path="doctor-payouts" element={<Hospital_DoctorPayouts />} />
        <Route path="pharmacy-reports" element={<Pharmacy_Reports />} />
        <Route path="lab-reports" element={<Lab_Reports />} />
        <Route path="diagnostics-dashboard" element={<Diagnostic_Dashboard />} />
        <Route path="staff-dashboard" element={<Hospital_StaffDashboard />} />
        <Route path="hospital-dashboard" element={<Hospital_Dashboard />} />
        <Route path="audit-logs" element={<Finance_AuditLogs />} />
        <Route path="chart-of-accounts" element={<Finance_ChartOfAccounts />} />
        <Route path="ledger/:accountId" element={<Finance_AccountLedger />} />
        <Route path="accounts-ledger" element={<Finance_AllAccountsLedger />} />
        <Route path="sidebar-permissions" element={<Finance_SidebarPermissions />} />
        <Route path="user-management" element={<Finance_UserManagement />} />
        <Route path="vouchers" element={<Finance_VoucherList />} />
        <Route path="vouchers/new" element={<Finance_VoucherForm />} />
        <Route path="vouchers/:id" element={<Finance_VoucherForm />} />
        <Route path="trial-balance" element={<Finance_TrialBalance />} />
        <Route path="profit-loss" element={<Finance_ProfitLoss />} />
        <Route path="balance-sheet" element={<Finance_BalanceSheet />} />
        <Route path="cash-flow" element={<Finance_CashFlow />} />
        <Route path="recurring-vouchers" element={<Finance_RecurringVouchers />} />
        <Route path="fiscal-periods" element={<Finance_FiscalPeriods />} />
        <Route path="budgets" element={<Finance_Budgets />} />
        <Route path="bank-reconciliation" element={<Finance_BankReconciliation />} />
        <Route path="approval-queue" element={<Finance_ApprovalQueue />} />
        <Route path="voucher-print" element={<Finance_VoucherPrint />} />
        <Route path="shift-reports" element={<Finance_ShiftReports />} />
        <Route path="shift-settings" element={<Finance_ShiftSettings />} />
        <Route path="expense-approvals" element={<Finance_ExpenseApprovals />} />
        <Route path="activity-log" element={<Finance_ActivityLog />} />
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
        <Route path="pay-in-out" element={<Reception_PayInOut />} />
        <Route path="diagnostic/token-generator" element={<Diagnostic_TokenGenerator />} />
        <Route path="diagnostic/token-history" element={<Diagnostic_TokenHistory />} />
        <Route path="diagnostic/sample-tracking" element={<Diagnostic_SampleTracking />} />
        <Route path="diagnostic/referrals" element={<Diagnostic_Referrals />} />
        <Route path="lab/sample-intake" element={<Lab_Orders />} />
        <Route path="lab/tokens" element={<Lab_TodaysTokens />} />
        <Route path="lab/sample-tracking" element={<Lab_Tracking />} />
        <Route path="lab/referrals" element={<Lab_Referrals />} />
        <Route path="lab/manager-cash-count" element={<Lab_ManagerCashCount />} />
      </Route>
      <Route path="/dialysis/login" element={<Dialysis_Login />} />
      <Route path="/dialysis" element={<Dialysis_Layout />}>
        <Route index element={<Dialysis_Dashboard />} />
        <Route path="token-generator" element={<Dialysis_TokenGenerator />} />
        <Route path="token-history" element={<Dialysis_TokenHistory />} />
        <Route path="patients" element={<Dialysis_Patients />} />
        <Route path="discharged" element={<Dialysis_Discharged />} />
        <Route path="sessions" element={<Dialysis_Sessions />} />
        <Route path="appointments" element={<Dialysis_Appointments />} />
        <Route path="user-management" element={<Dialysis_UserManagement />} />
        <Route path="sidebar-permissions" element={<Dialysis_SidebarPermissions />} />
        <Route path="audit" element={<Dialysis_AuditLogs />} />
        <Route path="settings" element={<Dialysis_Settings />} />
        <Route path="master-data" element={<Dialysis_MasterData />} />
      </Route>

      {/* Camp Portal */}
      <Route path="/camp/login" element={<Camp_Login />} />
      <Route path="/camp" element={<Camp_Layout />}>
        <Route index element={<Camp_Dashboard />} />
        <Route path="schedule" element={<Camp_Schedule />} />
        <Route path="patients" element={<Camp_Patients />} />
        <Route path="consultations" element={<Camp_Consultations />} />
        <Route path="prescriptions" element={<Camp_Prescriptions />} />
        <Route path="lab-orders" element={<Camp_LabOrders />} />
        <Route path="diagnostics" element={<Camp_Diagnostics />} />
        <Route path="dispensing" element={<Camp_Dispensing />} />
        <Route path="staff" element={<Camp_Staff />} />
        <Route path="reports" element={<Camp_Reports />} />
        <Route path="settings" element={<Camp_Settings />} />
        <Route path="user-management" element={<Camp_UserManagement />} />
        <Route path="sidebar-permissions" element={<Camp_SidebarPermissions />} />
      </Route>

      {/* Super Admin Portal */}
      <Route path="/super-admin/login" element={<SuperAdminLogin />} />
      <Route path="/super-admin" element={<SuperAdminGuard><SuperAdminDashboard /></SuperAdminGuard>} />
      <Route path="/super-admin/modules" element={<SuperAdminGuard><ModuleManager /></SuperAdminGuard>} />
      <Route path="/super-admin/client" element={<SuperAdminGuard><ClientProfilePage /></SuperAdminGuard>} />
      <Route path="/super-admin/usage" element={<SuperAdminGuard><UsageStatsPage /></SuperAdminGuard>} />
      <Route path="/super-admin/admins" element={<SuperAdminGuard><SuperAdminUsersPage /></SuperAdminGuard>} />
      {/* Admin Login */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      {/* Unified User Management (Admin Only) */}
      <Route path="/admin/users" element={<AdminGuard><AdminUserManagementPage /></AdminGuard>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  )
}
