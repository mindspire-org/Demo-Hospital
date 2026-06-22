import { useEffect, useRef, useState, useCallback } from "react";
import { pharmacyApi } from "../../utils/api";
import {
  X,
  Plus,
  Trash2,
  Search,
  Building2,
  Truck,
  FileText,
  Calendar,
  Package,
  Phone,
  MapPin,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import Pharmacy_AddSupplierDialog, {
  type Supplier,
} from "./pharmacy_AddSupplierDialog";
import Pharmacy_AddCompanyDialog, {
  type Company,
} from "./pharmacy_AddCompanyDialog";

export type PurchaseOrderItem = {
  id: string;
  inventoryItemId?: string;
  name: string;
  genericName?: string;
  category?: string;
  availableOnHand?: number;
  minStock?: number;
  minPackStock?: number;
  maxPackAllow?: number;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  notes?: string;
  maxQuantity?: number;
};

export type PurchaseOrder = {
  id?: string;
  _id?: string;
  poNumber?: string;
  date: string;
  expectedDeliveryDate?: string;
  supplierId?: string;
  supplierName?: string;
  supplierCustom?: string;
  companyId?: string;
  companyName?: string;
  companyCustom?: string;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  shippingAddress?: string;
  billingAddress?: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  shippingCost: number;
  discount: number;
  total: number;
  notes?: string;
  terms?: string;
  status?:
    | "draft"
    | "sent"
    | "confirmed"
    | "partially_received"
    | "received"
    | "cancelled";
};

type InventorySuggestion = {
  id: string;
  name: string;
  genericName?: string;
  category?: string;
  unitsPerPack?: number;
  minStock?: number;
  onHand?: number;
  lastSalePrice?: number;
  lastSupplier?: string;
  lastCompany?: string;
  lastPacksReceived?: number;
  maxPackAllow?: number;
  minPackStock?: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (po: PurchaseOrder) => void;
  initial?: PurchaseOrder | null;
  title?: string;
  submitLabel?: string;
};

export default function Pharmacy_CreatePurchaseOrderDialog({
  open,
  onClose,
  onSave,
  initial = null,
  title = "Create Purchase Order",
  submitLabel = "Create Purchase Order",
}: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [, setLoadingSuppliers] = useState(false);
  const [, setLoadingCompanies] = useState(false);

  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);

  const [alertModal, setAlertModal] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: "", message: "" });

  const [formData, setFormData] = useState<Partial<PurchaseOrder>>({
    date: new Date().toISOString().split("T")[0],
    expectedDeliveryDate: "",
    supplierId: "",
    supplierName: "",
    supplierCustom: "",
    companyId: "",
    companyName: "",
    companyCustom: "",
    contactPerson: "",
    contactPhone: "",
    contactEmail: "",
    shippingAddress: "",
    billingAddress: "",
    items: [],
    subtotal: 0,
    taxPercent: 0,
    taxAmount: 0,
    shippingCost: 0,
    discount: 0,
    total: 0,
    notes: "",
    terms: "",
  });

  const [items, setItems] = useState<PurchaseOrderItem[]>([
    {
      id: crypto.randomUUID(),
      name: "",
      quantity: 1,
      unit: "packs",
      estimatedUnitPrice: 0,
    },
  ]);

  const [lowStockForSupplier, setLowStockForSupplier] = useState<
    InventorySuggestion[]
  >([]);
  const [loadingLowStock, setLoadingLowStock] = useState(false);

  const [inventorySuggestions, setInventorySuggestions] = useState<
    Record<string, InventorySuggestion[]>
  >({});
  const [showSuggestions, setShowSuggestions] = useState<
    Record<number, boolean>
  >({});
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [inventoryDrugOptions, setInventoryDrugOptions] = useState<any[]>([]);
  const [selectedCompanyNames, setSelectedCompanyNames] = useState<string[]>(
    [],
  );
  const [lastPurchases, setLastPurchases] = useState<Record<string, any>>({});
  const firstItemNameRef = useRef<HTMLInputElement>(null);
  const orderDateRef = useRef<HTMLInputElement>(null);

  const fetchLastPurchases = useCallback(async () => {
    if (!formData.supplierName && selectedCompanyNames.length === 0) {
      setLastPurchases({});
      return;
    }
    try {
      const params: any = {};
      if (formData.supplierName) params.supplierName = formData.supplierName;
      if (selectedCompanyNames.length > 0)
        params.companyName = selectedCompanyNames[0];
      const res = await pharmacyApi.getLastPurchases(params);
      const map: Record<string, any> = {};
      for (const p of res.lastPurchases || []) {
        map[p.name.toLowerCase()] = p;
      }
      setLastPurchases(map);
    } catch (e) {
      console.error("Error fetching last purchases:", e);
    }
  }, [formData.supplierName, selectedCompanyNames]);

  useEffect(() => {
    fetchLastPurchases();
  }, [fetchLastPurchases]);

  // Load initial data only when initial changes or on first open
  useEffect(() => {
    if (initial) {
      setFormData({
        date: initial.date || new Date().toISOString().split("T")[0],
        expectedDeliveryDate: initial.expectedDeliveryDate || "",
        supplierId: initial.supplierId || "",
        supplierName: initial.supplierName || "",
        supplierCustom: initial.supplierCustom || "",
        companyId: initial.companyId || "",
        companyName: initial.companyName || "",
        companyCustom: initial.companyCustom || "",
        contactPerson: initial.contactPerson || "",
        contactPhone: initial.contactPhone || "",
        contactEmail: initial.contactEmail || "",
        shippingAddress: initial.shippingAddress || "",
        billingAddress: initial.billingAddress || "",
        subtotal: initial.subtotal || 0,
        taxPercent: initial.taxPercent || 0,
        taxAmount: initial.taxAmount || 0,
        shippingCost: initial.shippingCost || 0,
        discount: initial.discount || 0,
        total: initial.total || 0,
        notes: initial.notes || "",
        terms: initial.terms || "",
      });
      setItems(
        initial.items?.length
          ? initial.items
          : [
              {
                id: crypto.randomUUID(),
                name: "",
                quantity: 1,
                unit: "packs",
                estimatedUnitPrice: 0,
              },
            ],
      );
      setSelectedCompanyNames(
        (initial.companyName || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
    } else {
      // Reset for new PO
      setFormData({
        date: new Date().toISOString().split("T")[0],
        expectedDeliveryDate: "",
        supplierId: "",
        supplierName: "",
        supplierCustom: "",
        companyId: "",
        companyName: "",
        companyCustom: "",
        contactPerson: "",
        contactPhone: "",
        contactEmail: "",
        shippingAddress: "",
        billingAddress: "",
        items: [],
        subtotal: 0,
        taxPercent: 0,
        taxAmount: 0,
        shippingCost: 0,
        discount: 0,
        total: 0,
        notes: "",
        terms: "",
      });
      setItems([
        {
          id: crypto.randomUUID(),
          name: "",
          quantity: 1,
          unit: "packs",
          estimatedUnitPrice: 0,
        },
      ]);
      setSelectedCompanyNames([]);
    }
  }, [initial]);

  // Fetch suppliers and companies
  useEffect(() => {
    if (!open) return;

    let mounted = true;

    const fetchData = async () => {
      setLoadingSuppliers(true);
      setLoadingCompanies(true);

      try {
        const [suppliersRes, companiesRes] = await Promise.all([
          pharmacyApi.listSuppliers(),
          pharmacyApi.listCompanies(),
        ]);

        if (!mounted) return;

        const supplierItems =
          (suppliersRes as any)?.items || suppliersRes || [];
        const companyItems = (companiesRes as any)?.items || companiesRes || [];

        // Map _id to id for MongoDB compatibility
        const mappedSuppliers = supplierItems
          .map((s: any) => ({
            ...s,
            id: s.id || s._id,
          }))
          .filter((s: any) => s.status !== "Inactive");

        const mappedCompanies = companyItems
          .map((c: any) => ({
            ...c,
            id: c.id || c._id,
          }))
          .filter((c: any) => c.status !== "Inactive");

        setSuppliers(mappedSuppliers);
        setCompanies(mappedCompanies);
      } catch (e) {
        console.error("Error loading data:", e);
      } finally {
        if (mounted) {
          setLoadingSuppliers(false);
          setLoadingCompanies(false);
        }
      }
    };

    fetchData();

    // Auto-focus order date field when dialog opens (allows natural tab navigation)
    setTimeout(() => {
      orderDateRef.current?.focus();
    }, 100);

    return () => {
      mounted = false;
    };
  }, [open]);

  // Preload inventory summary for supplier-based suggestions
  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      try {
        const res: any = await pharmacyApi.inventorySummaryCached(
          { limit: 1000 },
          { ttlMs: 5 * 60_000 },
        );
        const items = res?.items || [];
        if (mounted) setInventoryDrugOptions(items);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, [open]);

  // Use ref to always have latest suppliers in handlers
  const suppliersRef = useRef(suppliers);
  suppliersRef.current = suppliers;
  const companiesRef = useRef(companies);
  companiesRef.current = companies;

  // Handle supplier selection
  const handleSupplierChange = useCallback(async (supplierId: string) => {
    console.log(
      "Selecting supplier:",
      supplierId,
      "Available:",
      suppliersRef.current.length,
    );
    const supplier = suppliersRef.current.find((s) => s.id === supplierId);
    if (supplier) {
      console.log("Found supplier, updating formData");

      // Fetch companies assigned to this supplier
      let assignedCompanyNames: string[] = [];
      try {
        const res: any = await pharmacyApi.listCompanies({
          distributorId: supplier.id,
          limit: 500,
        });
        const assignedCompanies = res?.items || res || [];
        assignedCompanyNames = assignedCompanies.map((c: any) => c.name);

        setFormData((prev) => ({
          ...prev,
          supplierId: supplier.id,
          supplierName: supplier.name,
          supplierCustom: "",
          contactPhone: supplier.phone || prev.contactPhone,
          companyId: "",
          companyName: assignedCompanyNames.join(", "),
          companyCustom: "",
        }));
        setSelectedCompanyNames(assignedCompanyNames);
      } catch (e) {
        console.error("Error fetching assigned companies:", e);
        setFormData((prev) => ({
          ...prev,
          supplierId: supplier.id,
          supplierName: supplier.name,
          supplierCustom: "",
          contactPhone: supplier.phone || prev.contactPhone,
        }));
      }

      // Fetch low and out of stock items for this supplier's assigned companies
      setLoadingLowStock(true);
      try {
        const [lowRes, outRes]: [any, any] = await Promise.all([
          pharmacyApi.listInventoryFilteredCached({
            status: "low",
            limit: 2000,
            companyNames: assignedCompanyNames,
          }),
          pharmacyApi.listInventoryFilteredCached({
            status: "out",
            limit: 2000,
            companyNames: assignedCompanyNames,
          }),
        ]);

        const allLow: any[] = lowRes?.items || lowRes || [];
        const allOut: any[] = outRes?.items || outRes || [];
        const combined = [...allLow, ...allOut];

        // Filter by assigned companies (manufacturers)
        const supplierRequired = combined
          .filter((it: any) => {
            const mfg = String(
              it.manufacturer || it.companyName || it.company || "",
            )
              .trim()
              .toLowerCase();
            return assignedCompanyNames.some((c) => c.toLowerCase() === mfg);
          })
          .map((it: any) => ({
            id: it._id || it.id,
            name: it.name,
            genericName: it.genericName,
            category: it.category,
            onHand: it.onHand,
            minStock: it.minStock,
            minPackStock: it.minPackStock,
            maxPackAllow: it.maxPackAllow,
            unitType: it.unitType,
            lastSalePrice: it.lastSalePerPack || it.lastSalePerUnit || 0,
            lastSupplier: it.lastSupplier,
            lastCompany: it.lastCompany,
            lastPacksReceived: it.lastPacksReceived,
          }));

        setLowStockForSupplier(supplierRequired);

        // Auto-add required items to PO
        if (supplierRequired.length) {
          const mapped = supplierRequired.map((it: any) => {
            const supplierMatch =
              (supplier.name || "").toLowerCase() ===
              (it.lastSupplier || "").toLowerCase();
            const companyMatch = assignedCompanyNames.some(
              (c) => c.toLowerCase() === (it.lastCompany || "").toLowerCase(),
            );
            const isSameSupplierOrCompany = supplierMatch || companyMatch;

            let quantity = Math.max(
              1,
              Number(it.minStock || 0) - Number(it.onHand || 0),
            );
            let maxQuantity: number | undefined = undefined;
            let minPackStock = it.minPackStock;
            let maxPackAllow = it.maxPackAllow;
            let unit = it.unitType || "packs";

            if (
              isSameSupplierOrCompany &&
              it.lastPacksReceived &&
              it.lastPacksReceived > 0
            ) {
              quantity = it.lastPacksReceived;
              maxQuantity = it.lastPacksReceived;
            }

            return {
              id: crypto.randomUUID(),
              inventoryItemId: it.id,
              name: it.name,
              genericName: it.genericName,
              category: it.category,
              availableOnHand: it.onHand,
              minStock: it.minStock,
              minPackStock,
              maxPackAllow,
              quantity,
              unit,
              estimatedUnitPrice: Number(it.lastSalePrice || 0),
              maxQuantity,
            };
          });
          setItems((prev) => {
            // Keep only items that don't have an inventoryItemId (manual entries)
            const manualEntries = prev.filter((p) => !p.inventoryItemId);

            // If the first item is empty, just use the new items
            if (
              manualEntries.length === 1 &&
              !String(manualEntries[0].name || "").trim()
            ) {
              return mapped;
            }

            return [...manualEntries, ...mapped];
          });
        } else {
          // If no items for new supplier, reset to one empty row if only auto-added items were present
          setItems((prev) => {
            const manualEntries = prev.filter((p) => !p.inventoryItemId);
            if (manualEntries.length === 0) {
              return [
                {
                  id: crypto.randomUUID(),
                  name: "",
                  quantity: 1,
                  unit: "packs",
                  estimatedUnitPrice: 0,
                },
              ];
            }
            return manualEntries;
          });
        }
      } catch (e) {
        console.error("Error loading stock for supplier:", e);
      } finally {
        setLoadingLowStock(false);
      }
    } else if (supplierId === "custom") {
      setFormData((prev) => ({
        ...prev,
        supplierId: "custom",
        supplierName: "",
        supplierCustom: "",
      }));
      setLowStockForSupplier([]);
      setSelectedCompanyNames([]);
    } else {
      setFormData((prev) => ({
        ...prev,
        supplierId: "",
        supplierName: "",
        supplierCustom: "",
      }));
      setLowStockForSupplier([]);
      setSelectedCompanyNames([]);
    }
  }, []);

  // Handle company selection (multi)
  const handleCompanyChange = useCallback(
    (companyId: string) => {
      if (companyId === "custom") {
        setFormData((prev) => ({
          ...prev,
          companyId: "custom",
          companyName: "",
          companyCustom: "",
        }));
        return;
      }
      const company = companies.find((c) => c.id === companyId);
      if (company) {
        setSelectedCompanyNames((prev) => {
          if (prev.includes(company.name)) return prev;
          const next = [...prev, company.name];
          setFormData((p) => ({
            ...p,
            companyId: "",
            companyName: next.join(", "),
            companyCustom: "",
          }));
          return next;
        });
      } else {
        setFormData((prev) => ({
          ...prev,
          companyId: "",
          companyName: "",
          companyCustom: "",
        }));
      }
    },
    [companies],
  );

  const removeCompany = (name: string) => {
    setSelectedCompanyNames((prev) => {
      const next = prev.filter((n) => n !== name);
      setFormData((p) => ({ ...p, companyName: next.join(", ") }));

      // Update items list: remove auto-added items that belong to the removed company
      setItems((itemsPrev) => {
        const stillValid = itemsPrev.filter((item) => {
          if (!item.inventoryItemId) return true; // Keep manual entries

          // Find the source item in the low stock list to check its manufacturer
          const sourceItem = lowStockForSupplier.find(
            (it) => it.id === item.inventoryItemId,
          );
          if (!sourceItem) return true; // Keep if not found (might be custom or already in PO)

          const mfg = String(sourceItem.lastSupplier || "")
            .trim()
            .toLowerCase();
          return next.some((c) => c.toLowerCase().trim() === mfg);
        });

        if (stillValid.length === 0) {
          return [
            {
              id: crypto.randomUUID(),
              name: "",
              quantity: 1,
              unit: "packs",
              estimatedUnitPrice: 0,
            },
          ];
        }
        return stillValid;
      });

      return next;
    });
  };

  const addCustomCompany = () => {
    const name = String(formData.companyCustom || "").trim();
    if (!name) return;
    setSelectedCompanyNames((prev) => {
      if (prev.includes(name)) return prev;
      const next = [...prev, name];
      setFormData((p) => ({
        ...p,
        companyId: "",
        companyName: next.join(", "),
        companyCustom: "",
      }));
      return next;
    });
  };

  // Search inventory items
  const searchInventory = useCallback(
    async (query: string, itemIndex: number) => {
      const supplierName = (formData.supplierName || "").trim();
      const assignedCompanies = selectedCompanyNames.map((c) =>
        c.toLowerCase(),
      );

      if (!query.trim()) {
        if (
          supplierName &&
          formData.supplierId &&
          formData.supplierId !== "custom" &&
          assignedCompanies.length > 0
        ) {
          const supplierItems = inventoryDrugOptions
            .filter((d: any) => {
              const mfg = String(d.manufacturer || "")
                .trim()
                .toLowerCase();
              return assignedCompanies.includes(mfg);
            })
            .map((d: any) => ({
              id: d.name?.toLowerCase?.() || d.name,
              name: d.name,
              genericName: d.lastGenericName || d.genericName,
              category: d.category,
              unitsPerPack: d.unitsPerPack,
              minStock: d.minStock,
              onHand: d.onHand,
              lastSalePrice: d.lastSalePerUnit,
              lastSupplier: d.lastSupplier,
              lastCompany: d.lastCompany,
              lastPacksReceived: d.lastPacksReceived,
            }));
          setInventorySuggestions((prev) => ({
            ...prev,
            [itemIndex]: supplierItems.slice(0, 50),
          }));
          setShowSuggestions((prev) => ({ ...prev, [itemIndex]: true }));
        } else {
          setInventorySuggestions((prev) => ({ ...prev, [itemIndex]: [] }));
        }
        return;
      }

      try {
        const res: any = await pharmacyApi.getPurchaseOrderInventorySuggestions(
          query,
          500,
          selectedCompanyNames,
        );
        const filtered = res?.items || [];
        setInventorySuggestions((prev) => ({
          ...prev,
          [itemIndex]: filtered.slice(0, 100),
        }));
        setShowSuggestions((prev) => ({ ...prev, [itemIndex]: true }));
      } catch (e) {
        console.error("Error searching inventory:", e);
      }
    },
    [
      formData.supplierName,
      formData.supplierId,
      inventoryDrugOptions,
      selectedCompanyNames,
    ],
  );

  // Handle item name change with suggestions
  const handleItemNameChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], name: value };
    setItems(newItems);

    // Debounced search
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      searchInventory(value, index);
    }, 300);
  };

  // Select suggestion
  const selectSuggestion = (index: number, suggestion: InventorySuggestion) => {
    const newItems = [...items];

    const lastPurchase = lastPurchases[suggestion.name.toLowerCase()];
    const supplierMatch =
      (formData.supplierName || "").toLowerCase() ===
      (lastPurchase?.lastSupplier || "").toLowerCase();
    const companyMatch = selectedCompanyNames.some(
      (c) =>
        c.toLowerCase() === (lastPurchase?.lastCompany || "").toLowerCase(),
    );
    const isSameSupplierOrCompany = supplierMatch || companyMatch;

    let quantity = Math.max(1, Number(suggestion.onHand || 0));
    let unit = "packs";
    let maxQuantity: number | undefined = undefined;
    let minPackStock: number | undefined = suggestion.minPackStock;
    let maxPackAllow: number | undefined = suggestion.maxPackAllow;

    if (
      isSameSupplierOrCompany &&
      lastPurchase?.lastPacksReceived &&
      lastPurchase.lastPacksReceived > 0
    ) {
      quantity = lastPurchase.lastPacksReceived;
      maxQuantity = lastPurchase.lastPacksReceived;
      if (lastPurchase.minPackStock != null)
        minPackStock = lastPurchase.minPackStock;
      if (lastPurchase.maxPackAllow != null)
        maxPackAllow = lastPurchase.maxPackAllow;
      if (lastPurchase.unit) unit = lastPurchase.unit;
    }

    newItems[index] = {
      ...newItems[index],
      inventoryItemId: suggestion.id,
      name: suggestion.name,
      genericName: suggestion.genericName,
      category: suggestion.category,
      availableOnHand: suggestion.onHand,
      minStock: suggestion.minStock,
      minPackStock,
      maxPackAllow,
      quantity,
      unit,
      estimatedUnitPrice: suggestion.lastSalePrice || 0,
      maxQuantity,
    };
    setItems(newItems);
    setShowSuggestions((prev) => ({ ...prev, [index]: false }));
    setInventorySuggestions((prev) => ({ ...prev, [index]: [] }));
  };

  // Add new item row
  const addItem = () => {
    const newIndex = items.length;
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        name: "",
        quantity: 1,
        unit: "packs",
        estimatedUnitPrice: 0,
      },
    ]);
    setTimeout(() => {
      searchInventory("", newIndex);
    }, 0);
  };

  // Remove item row
  const removeItem = (index: number) => {
    if (items.length === 1) {
      setItems([
        {
          id: crypto.randomUUID(),
          name: "",
          quantity: 1,
          unit: "packs",
          estimatedUnitPrice: 0,
        },
      ]);
    } else {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Update item field
  const updateItem = (
    index: number,
    field: keyof PurchaseOrderItem,
    value: any,
  ) => {
    const newItems = [...items];
    let finalValue = value;
    if (field === "quantity" && newItems[index].maxQuantity) {
      finalValue = Math.min(
        Math.max(1, finalValue),
        newItems[index].maxQuantity,
      );
    }
    newItems[index] = { ...newItems[index], [field]: finalValue };
    setItems(newItems);
  };

  // Quick add low stock item
  const addLowStockItem = (item: InventorySuggestion) => {
    const lastPurchase = lastPurchases[item.name.toLowerCase()];
    const supplierMatch =
      (formData.supplierName || "").toLowerCase() ===
      (lastPurchase?.lastSupplier || "").toLowerCase();
    const companyMatch = selectedCompanyNames.some(
      (c) =>
        c.toLowerCase() === (lastPurchase?.lastCompany || "").toLowerCase(),
    );
    const isSameSupplierOrCompany = supplierMatch || companyMatch;

    let quantity = Math.max(
      1,
      Number(item.minStock || 0) - Number(item.onHand || 0),
    );
    let unit = "packs";
    let maxQuantity: number | undefined = undefined;
    let minPackStock: number | undefined = item.minPackStock;
    let maxPackAllow: number | undefined = item.maxPackAllow;

    if (
      isSameSupplierOrCompany &&
      lastPurchase?.lastPacksReceived &&
      lastPurchase.lastPacksReceived > 0
    ) {
      quantity = lastPurchase.lastPacksReceived;
      maxQuantity = lastPurchase.lastPacksReceived;
      if (lastPurchase.minPackStock != null)
        minPackStock = lastPurchase.minPackStock;
      if (lastPurchase.maxPackAllow != null)
        maxPackAllow = lastPurchase.maxPackAllow;
    }

    const newItem = {
      id: crypto.randomUUID(),
      inventoryItemId: item.id,
      name: item.name,
      genericName: item.genericName,
      category: item.category,
      availableOnHand: item.onHand,
      minStock: item.minStock,
      minPackStock,
      maxPackAllow,
      quantity,
      unit,
      estimatedUnitPrice: item.lastSalePrice || 0,
      maxQuantity,
    };

    // If the first row is empty, use it
    if (items.length === 1 && !items[0].name.trim()) {
      setItems([newItem]);
    } else {
      // Check if item already exists in PO
      const exists = items.find((it) => it.inventoryItemId === item.id);
      if (exists) return;

      setItems([...items, newItem]);
    }
  };

  // Calculate totals
  useEffect(() => {
    const subtotal = items.reduce(
      (sum, item) =>
        sum + (item.estimatedUnitPrice || 0) * (item.quantity || 0),
      0,
    );
    const taxPercent = formData.taxPercent || 0;
    const taxAmount = (subtotal * taxPercent) / 100;
    const shippingCost = formData.shippingCost || 0;
    const discount = formData.discount || 0;
    const total = subtotal + taxAmount + shippingCost - discount;

    setFormData((prev) => ({
      ...prev,
      subtotal,
      taxAmount,
      total,
    }));
  }, [items, formData.taxPercent, formData.shippingCost, formData.discount]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions({});
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = items.filter(
      (item) => item.name.trim() && item.quantity > 0,
    );

    if (validItems.length === 0) {
      setAlertModal({
        open: true,
        title: "Validation Error",
        message: "Please add at least one item",
      });
      return;
    }

    if (
      !formData.supplierId &&
      !formData.supplierCustom?.trim() &&
      !formData.companyId &&
      !formData.companyCustom?.trim() &&
      !String(formData.companyName || "").trim()
    ) {
      setAlertModal({
        open: true,
        title: "Validation Error",
        message: "Please select or enter a supplier or company",
      });
      return;
    }

    const po: PurchaseOrder = {
      ...formData,
      id: initial?.id,
      poNumber: initial?.poNumber,
      items: validItems,
      subtotal: formData.subtotal || 0,
      taxPercent: formData.taxPercent || 0,
      taxAmount: formData.taxAmount || 0,
      shippingCost: formData.shippingCost || 0,
      discount: formData.discount || 0,
      total: formData.total || 0,
      supplierName:
        formData.supplierId === "custom"
          ? formData.supplierCustom
          : formData.supplierName,
      companyName:
        formData.companyId === "custom"
          ? formData.companyCustom
          : formData.companyName,
      date: formData.date || new Date().toISOString().split("T")[0],
    } as PurchaseOrder;

    onSave(po);
    onClose();
  };

  const handleClose = () => {
    setItems([
      {
        id: crypto.randomUUID(),
        name: "",
        quantity: 1,
        unit: "packs",
        estimatedUnitPrice: 0,
      },
    ]);
    setFormData({
      date: new Date().toISOString().split("T")[0],
      expectedDeliveryDate: "",
      supplierId: "",
      supplierName: "",
      supplierCustom: "",
      companyId: "",
      companyName: "",
      companyCustom: "",
      contactPerson: "",
      contactPhone: "",
      contactEmail: "",
      shippingAddress: "",
      billingAddress: "",
      items: [],
      subtotal: 0,
      taxPercent: 0,
      taxAmount: 0,
      shippingCost: 0,
      discount: 0,
      total: 0,
      notes: "",
      terms: "",
    });
    setInventorySuggestions({});
    setShowSuggestions({});
    setSelectedCompanyNames([]);
    onClose();
  };

  const handleSupplierSaved = (supplier: Supplier) => {
    setSuppliers((prev) => [...prev, supplier]);
    handleSupplierChange(supplier.id);
    setTimeout(() => {
      firstItemNameRef.current?.focus();
    }, 100);
  };

  const handleCompanySaved = (company: Company) => {
    setCompanies((prev) => [...prev, company]);
    handleCompanyChange(company.id);
    setTimeout(() => {
      firstItemNameRef.current?.focus();
    }, 100);
  };

  if (!open) return null;

  const isCustomSupplier = formData.supplierId === "custom";
  const isCustomCompany = formData.companyId === "custom";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-7xl h-[90vh] flex flex-col bg-white shadow-2xl rounded-xl overflow-hidden animate-in zoom-in-95 duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-linear-to-r from-blue-800 to-blue-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="text-sm text-blue-100">
                Create a new purchase order for inventory
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-white/80 hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Left Side: Items List (60%) */}
          <div className="w-[60%] border-r border-slate-200 bg-slate-50/30 flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Package className="h-4 w-4 text-blue-600" />
                Order Items ({items.length})
              </h4>
              <button
                type="button"
                onClick={addItem}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </button>
            </div>

            <div
              className="flex-1 overflow-y-auto p-4 space-y-4"
              ref={suggestionsRef}
            >
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-400 hover:shadow-md relative"
                >
                  <div className="flex gap-6">
                    {/* Item Name with Autocomplete */}
                    <div className="flex-1 relative">
                      <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-slate-500">
                        Item Name *
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          ref={index === 0 ? firstItemNameRef : null}
                          value={item.name}
                          onChange={(e) =>
                            handleItemNameChange(index, e.target.value)
                          }
                          onFocus={() => {
                            if (item.name) searchInventory(item.name, index);
                          }}
                          placeholder="Search items..."
                          required
                          className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 text-sm font-bold focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                        />
                      </div>

                      {/* Suggestions Dropdown */}
                      {showSuggestions[index] &&
                        inventorySuggestions[index]?.length > 0 && (
                          <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[350px] rounded-xl border border-slate-200 bg-white shadow-2xl max-h-80 overflow-y-auto py-2.5">
                            {inventorySuggestions[index].map((suggestion) => (
                              <button
                                key={suggestion.id}
                                type="button"
                                onClick={() =>
                                  selectSuggestion(index, suggestion)
                                }
                                className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors group/item border-b border-slate-50 last:border-0"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="font-black text-sm text-slate-800 group-hover/item:text-blue-700">
                                    {suggestion.name}
                                  </div>
                                  {suggestion.lastSupplier &&
                                    suggestion.lastSupplier.toLowerCase() ===
                                      formData.supplierName?.toLowerCase() && (
                                      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-700 uppercase">
                                        Match
                                      </span>
                                    )}
                                </div>
                                <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500 font-bold">
                                  {suggestion.onHand !== undefined && (
                                    <span className="text-slate-700">
                                      Stock: {suggestion.onHand}
                                    </span>
                                  )}
                                  {suggestion.genericName && (
                                    <span className="text-slate-400 italic">
                                      {suggestion.genericName}
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                    </div>

                    <div className="flex gap-4 w-full">
                      <div className="w-24">
                        <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-slate-500">
                          Qty
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={item.maxQuantity}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "quantity",
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none text-center"
                        />
                      </div>
                      <div className="w-24">
                        <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-slate-500">
                          Min (pk)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.minPackStock || ""}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "minPackStock",
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none text-center"
                        />
                      </div>
                      <div className="w-24">
                        <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-slate-500">
                          Max (pk)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.maxPackAllow || ""}
                          onChange={(e) =>
                            updateItem(
                              index,
                              "maxPackAllow",
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none text-center"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-slate-500">
                          Category
                        </label>
                        <input
                          type="text"
                          value={item.category || ""}
                          onChange={(e) =>
                            updateItem(index, "category", e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-bold focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col justify-end pb-2.5">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-90"
                        title="Remove item"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400 font-bold flex items-center gap-2">
                    <span className="uppercase tracking-tighter">
                      Available Stock:
                    </span>
                    <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                      {item.availableOnHand ?? 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-200 bg-white shrink-0">
              <div className="flex items-center justify-between text-sm font-bold text-slate-700">
                <span>Total Items:</span>
                <span>{items.length}</span>
              </div>
            </div>
          </div>

          {/* Right Side: Form Details (40%) */}
          <div className="w-[40%] overflow-y-auto p-6 bg-white">
            <div className="space-y-6">
              {/* Order Info */}
              <div className="rounded-xl border border-slate-200 p-4">
                <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Order Dates
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Order Date *
                    </label>
                    <input
                      ref={orderDateRef}
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          date: e.target.value,
                        }))
                      }
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Expected Delivery
                    </label>
                    <input
                      type="date"
                      value={formData.expectedDeliveryDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          expectedDeliveryDate: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Supplier Section */}
              <div className="rounded-xl border border-slate-200 p-4">
                <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Truck className="h-4 w-4 text-blue-600" />
                  Supplier
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <select
                        value={formData.supplierId || ""}
                        onChange={(e) => handleSupplierChange(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none appearance-none bg-white"
                      >
                        <option value="">— Select Supplier —</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                        <option value="custom">+ Custom Supplier</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setAddSupplierOpen(true)}
                      className="flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border border-blue-200"
                      title="Add New Supplier"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                  {formData.supplierName && !isCustomSupplier && (
                    <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-1.5 flex items-center justify-between">
                      <span className="text-xs font-medium text-blue-800">
                        {formData.supplierName}
                      </span>
                      <Phone className="h-3 w-3 text-blue-400" />
                    </div>
                  )}
                </div>
              </div>

              {/* Low Stock Suggestions Section */}
              {formData.supplierId && !isCustomSupplier && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Auto-Suggested Low Stock
                    </h4>
                    {loadingLowStock && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
                    )}
                  </div>

                  {lowStockForSupplier.length > 0 ? (
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                      {lowStockForSupplier.map((it) => {
                        const inCart = items.some(
                          (cartItem) => cartItem.inventoryItemId === it.id,
                        );
                        return (
                          <button
                            key={it.id}
                            type="button"
                            disabled={inCart}
                            onClick={() => addLowStockItem(it)}
                            className={`inline-flex flex-col items-start rounded-lg border px-2 py-1.5 text-left transition-all hover:shadow-sm ${
                              inCart
                                ? "border-slate-200 bg-slate-100 opacity-60 cursor-default"
                                : "border-amber-200 bg-white hover:border-amber-400"
                            }`}
                          >
                            <span className="text-[10px] font-semibold text-slate-800 truncate max-w-[120px]">
                              {it.name}
                            </span>
                            <span className="text-[8px] text-amber-700">
                              Stock: {it.onHand} / Min: {it.minStock}
                            </span>
                            {!inCart && (
                              <span className="mt-0.5 text-[8px] font-bold text-blue-600">
                                + Add
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : !loadingLowStock ? (
                    <p className="text-[10px] text-slate-500 italic">
                      No low stock items found.
                    </p>
                  ) : null}
                </div>
              )}

              {/* Company & Details Section */}
              <div className="space-y-6">
                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    Assigned Companies
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <select
                          value={formData.companyId || ""}
                          onChange={(e) => handleCompanyChange(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none appearance-none bg-white"
                        >
                          <option value="">— Add Company —</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                          <option value="custom">+ Custom Company</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setAddCompanyOpen(true)}
                        className="flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors border border-purple-200"
                        title="Add New Company"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>

                    {selectedCompanyNames.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedCompanyNames.map((name) => (
                          <span
                            key={name}
                            className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-[11px] font-medium text-purple-700 border border-purple-200"
                          >
                            {name}
                            <button
                              type="button"
                              onClick={() => removeCompany(name)}
                              className="ml-1 rounded-full hover:bg-purple-200 px-1"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Internal Notes
                  </h4>
                  <textarea
                    value={formData.notes || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Internal notes..."
                    rows={2}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                  />
                </div>
              </div>

              {/* Addresses */}
              <div className="rounded-xl border border-slate-200 p-4">
                <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  Address Details
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Shipping Address
                    </label>
                    <textarea
                      value={formData.shippingAddress || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          shippingAddress: e.target.value,
                        }))
                      }
                      placeholder="Shipping address..."
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      Billing Address
                    </label>
                    <textarea
                      value={formData.billingAddress || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          billingAddress: e.target.value,
                        }))
                      }
                      placeholder="Billing address..."
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            {submitLabel}
          </button>
        </div>
      </form>

      {/* Sub-dialogs */}
      <Pharmacy_AddSupplierDialog
        open={addSupplierOpen}
        onClose={() => setAddSupplierOpen(false)}
        onSave={handleSupplierSaved}
      />
      <Pharmacy_AddCompanyDialog
        open={addCompanyOpen}
        onClose={() => setAddCompanyOpen(false)}
        onSave={handleCompanySaved}
      />

      {/* Alert Modal */}
      {alertModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 px-6 py-4 bg-linear-to-r from-amber-50 to-orange-50 border-b border-amber-100">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">
                {alertModal.title}
              </h3>
            </div>
            <div className="px-6 py-6">
              <p className="text-sm text-slate-600">{alertModal.message}</p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() =>
                  setAlertModal({ open: false, title: "", message: "" })
                }
                className="rounded-lg bg-slate-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
