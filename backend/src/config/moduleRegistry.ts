export const MODULE_REGISTRY = {
  hospital: {
    label: 'Hospital',
    subModules: {
      tokenGen:    { label: 'Token Generation',  pathPrefixes: ['/hospital/token-generator','/hospital/today-tokens','/hospital/token-history','/hospital/my-activity-report','/hospital/departments','/hospital/appointments','/hospital/finance/cash-sessions','/hospital/search-patients','/hospital/patients'] },
      er:          { label: 'ER Management',     pathPrefixes: ['/hospital/emergency','/hospital/er-'] },
      ipd:         { label: 'IPD Management',    pathPrefixes: ['/hospital/ipd','/hospital/bed-management','/hospital/patient-list','/hospital/ipd-referrals','/hospital/ipd-services','/hospital/discharged','/hospital/ipd-billing','/hospital/ipd-transactions'] },
      ipdForms:    { label: 'IPD Forms',         pathPrefixes: ['/hospital/forms/'] },
      ot:          { label: 'OT Management',     pathPrefixes: ['/hospital/ot'] },
      icu:         { label: 'ICU Management',    pathPrefixes: ['/hospital/icu'] },
      store:       { label: 'Store & Inventory', pathPrefixes: ['/hospital/store'] },
      equipment:   { label: 'Equipment',         pathPrefixes: ['/hospital/equipment'] },
      ambulance:   { label: 'Ambulance',         pathPrefixes: ['/hospital/ambulance'] },
      staff:       { label: 'Staff Management',  pathPrefixes: ['/hospital/staff-','/hospital/biometric-settings','/hospital/staff-management'] },
      doctor:      { label: 'Doctor Management', pathPrefixes: ['/hospital/doctors','/hospital/doctor-schedules','/hospital/finance/doctors','/hospital/finance/doctor-payouts'] },
      corporate:   { label: 'Corporate',         pathPrefixes: ['/hospital/corporate'] },
      nursePortal: { label: 'Nurse Portal',      pathPrefixes: ['/hospital/nurse/'] },
      nurseAdmin:  { label: 'Nurse Admin',       pathPrefixes: ['/hospital/nurse-admin/'] },
      admin:       { label: 'Admin',             pathPrefixes: ['/hospital/user-management','/hospital/audit','/hospital/backup','/hospital/settings','/hospital/sidebar-permissions'] },
    },
  },
  lab: {
    label: 'Lab',
    subModules: {
      orders:       { label: 'Orders',       pathPrefixes: ['/lab/orders','/lab/tests'] },
      tokens:       { label: 'Tokens',       pathPrefixes: ['/lab/tokens','/lab/today-tokens'] },
      appointments: { label: 'Appointments', pathPrefixes: ['/lab/appointments'] },
      reports:      { label: 'Reports',      pathPrefixes: ['/lab/reports'] },
      settings:     { label: 'Settings',     pathPrefixes: ['/lab/settings','/lab/rate-lists'] },
    },
  },
  pharmacy: {
    label: 'Pharmacy',
    subModules: {
      pos:        { label: 'POS',        pathPrefixes: ['/pharmacy/pos','/pharmacy/sales'] },
      inventory:  { label: 'Inventory',  pathPrefixes: ['/pharmacy/inventory','/pharmacy/medicines'] },
      returns:    { label: 'Returns',    pathPrefixes: ['/pharmacy/returns'] },
      customers:  { label: 'Customers',  pathPrefixes: ['/pharmacy/customers'] },
      reports:    { label: 'Reports',    pathPrefixes: ['/pharmacy/reports'] },
    },
  },
  indoorPharmacy: {
    label: 'Indoor Pharmacy',
    subModules: {
      pos:       { label: 'POS',       pathPrefixes: ['/indoor-pharmacy/pos','/indoor-pharmacy/sales'] },
      orders:    { label: 'Orders',    pathPrefixes: ['/indoor-pharmacy/orders'] },
      inventory: { label: 'Inventory', pathPrefixes: ['/indoor-pharmacy/inventory'] },
      returns:   { label: 'Returns',   pathPrefixes: ['/indoor-pharmacy/returns'] },
      reports:   { label: 'Reports',   pathPrefixes: ['/indoor-pharmacy/reports'] },
    },
  },
  diagnostic: {
    label: 'Diagnostics',
    subModules: {
      tokens:  { label: 'Tokens',  pathPrefixes: ['/diagnostic/tokens','/diagnostic/today-tokens'] },
      orders:  { label: 'Orders',  pathPrefixes: ['/diagnostic/orders','/diagnostic/tests'] },
      reports: { label: 'Reports', pathPrefixes: ['/diagnostic/reports'] },
      settings:{ label: 'Settings',pathPrefixes: ['/diagnostic/settings','/diagnostic/rate-lists'] },
    },
  },
  dialysis: {
    label: 'Dialysis',
    subModules: {
      patients:  { label: 'Patients',  pathPrefixes: ['/dialysis/patients'] },
      schedules: { label: 'Schedules', pathPrefixes: ['/dialysis/schedules'] },
      treatments:{ label: 'Treatments',pathPrefixes: ['/dialysis/treatments'] },
      reports:   { label: 'Reports',   pathPrefixes: ['/dialysis/reports'] },
    },
  },
  finance: {
    label: 'Finance',
    subModules: {
      transactions:{ label: 'Transactions', pathPrefixes: ['/finance/transactions','/finance/income','/finance/expenses'] },
      ledger:      { label: 'Ledger',       pathPrefixes: ['/finance/ledger'] },
      reports:     { label: 'Reports',      pathPrefixes: ['/finance/reports'] },
    },
  },
  reception: {
    label: 'Reception',
    subModules: {
      intake:      { label: 'Intake',       pathPrefixes: ['/reception/intake','/reception/register'] },
      appointments:{ label: 'Appointments', pathPrefixes: ['/reception/appointments'] },
      tokens:      { label: 'Tokens',       pathPrefixes: ['/reception/tokens'] },
    },
  },
  aesthetic: {
    label: 'Aesthetic',
    subModules: {
      appointments:{ label: 'Appointments', pathPrefixes: ['/aesthetic/appointments'] },
      treatments:  { label: 'Treatments',   pathPrefixes: ['/aesthetic/treatments','/aesthetic/procedures'] },
      inventory:   { label: 'Inventory',    pathPrefixes: ['/aesthetic/inventory'] },
    },
  },
} as const

export type ModuleId = keyof typeof MODULE_REGISTRY
export type SubModuleId<M extends ModuleId = ModuleId> = keyof (typeof MODULE_REGISTRY)[M]['subModules']

export function resolveSubModule(moduleId: string, path: string): string | null {
  const mod = (MODULE_REGISTRY as any)[moduleId]
  if (!mod) return null
  let best: string | null = null
  let bestLen = 0
  for (const [subId, sub] of Object.entries(mod.subModules as Record<string, { pathPrefixes: string[] }>)) {
    for (const prefix of sub.pathPrefixes) {
      if (path.startsWith(prefix) && prefix.length > bestLen) {
        best = subId
        bestLen = prefix.length
      }
    }
  }
  return best
}

export function getAllSubModules(moduleId: string): string[] {
  const mod = (MODULE_REGISTRY as any)[moduleId]
  if (!mod) return []
  return Object.keys(mod.subModules)
}

export function getAllModuleIds(): string[] {
  return Object.keys(MODULE_REGISTRY)
}
