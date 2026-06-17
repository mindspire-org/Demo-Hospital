# Pharmacy Purchase Import Template

## Excel File Format

Create an Excel file (.xlsx or .xls) with the following headers in the first row:

### Required Headers:

| Column Name | Description | Required | Example |
|------------|-------------|----------|---------|
| Medicine Name | Name of the medicine | ✅ Yes | Paracetamol 500mg |
| Generic Name | Generic/scientific name | ❌ No | Acetaminophen |
| Category | Medicine category | ❌ No | Analgesic |
| Expiry Date | Expiration date (YYYY-MM-DD) | ❌ No | 2025-12-31 |
| Packs | Number of packs | ✅ Yes | 10 |
| Units Per Pack | Units in one pack | ✅ Yes | 20 |
| Buy Per Pack | Purchase price per pack | ❌ No | 150.00 |
| Sale Per Pack | Selling price per pack | ❌ No | 200.00 |
| Store Name | Store/location name | ❌ No | Main Store |
| Barcode | Product barcode | ❌ No | 1234567890 |
| Min Stock | Minimum stock level | ❌ No | 5 |

## Example Excel Data:

```
Medicine Name       | Generic Name    | Category  | Expiry Date | Packs | Units Per Pack | Buy Per Pack | Sale Per Pack | Store Name  | Barcode      | Min Stock
Paracetamol 500mg  | Acetaminophen   | Analgesic | 2025-12-31  | 10    | 20            | 150.00       | 200.00        | Main Store  | 1234567890   | 5
Amoxicillin 250mg  | Amoxicillin     | Antibiotic| 2025-06-30  | 5     | 15            | 200.00       | 280.00        | Branch A    | 0987654321   | 3
Ibuprofen 400mg    | Ibuprofen       | NSAID     | 2026-01-15  | 8     | 10            | 120.00       | 160.00        | Main Store  | 1122334455   | 4
```

## Import Process:

1. Click the "Import Excel" button in the Inventory page
2. Select your Excel file
3. Review the preview of first 5 rows
4. Click "Import" to add all items to Pending Review
5. Go to "Pending Review" tab to approve or reject items
6. Once approved, items will be added to inventory

## Notes:

- All imported items will be grouped under a single invoice with format: `IMPORT_[timestamp]`
- Supplier will be set as "Excel Import"
- Items go to "Pending Review" first, allowing you to verify before adding to inventory
- Date format must be YYYY-MM-DD (e.g., 2025-12-31)
- Numeric fields should contain only numbers (no currency symbols)
- Medicine Name, Packs, and Units Per Pack are mandatory
