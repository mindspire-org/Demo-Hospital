import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { pharmacyApi } from "../../utils/api";
import {
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
  ArrowLeft,
} from "lucide-react";
import Pharmacy_AddSupplierDialog, {
  type Supplier,
} from "../../components/pharmacy/pharmacy_AddSupplierDialog";
import Pharmacy_AddCompanyDialog, {
  type Company,
} from "../../components/pharmacy/pharmacy_AddCompanyDialog";

export type PurchaseOrderItem = {
  id: string;
  inventoryItemId?: string;
  name: string;
  genericName?: string;
  category?: string;
  availableOnHand?: number;
  minPackStock?: number;
  maxPackAllow?: number;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  notes?: string;
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
  minPackStock?: number;
  minStock?: number;
  maxPackAllow?: number;
  onHand?: number;
  lastSalePrice?: number;
  lastBuyPerPack?: number;
  lastSupplier?: string;
};

export default function Pharmacy_CreatePurchaseOrderPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [, setLoadingSuppliers] = useState(false);
  const [, setLoadingCompanies] = useState(false);

  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);

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

  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [lowStockSearchQuery, setLowStockSearchQuery] = useState("");

  const [inventorySuggestions, setInventorySuggestions] = useState<
    Record<string, InventorySuggestion[]>
  >({});
  const [showSuggestions, setShowSuggestions] = useState<
    Record<number, boolean>
  >({});
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState<
    Record<number, number>
  >({});
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [inventoryDrugOptions, setInventoryDrugOptions] = useState<any[]>([]);
  const [selectedCompanyNames, setSelectedCompanyNames] = useState<string[]>(
    [],
  );
  const firstItemNameRef = useRef<HTMLInputElement>(null);
  const lastItemNameRef = useRef<HTMLInputElement>(null);
  const orderDateRef = useRef<HTMLInputElement>(null);

  const [alertModal, setAlertModal] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({ open: false, title: "", message: "" });

  // Load order data if editing
  useEffect(() => {
    if (isEditing) {
      const fetchOrder = async () => {
        try {
          const order: any = await pharmacyApi.getPurchaseOrder(id);
          if (order) {
            setFormData({
              ...order,
              date: order.date || new Date().toISOString().split("T")[0],
            });
            setItems(
              order.items?.length
                ? order.items
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
              (order.companyName || "")
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean),
            );
          }
        } catch (e) {
          console.error("Error fetching order:", e);
          navigate("/pharmacy/purchase-orders");
        }
      };
      fetchOrder();
    }
  }, [id, isEditing, navigate]);

  // Fetch suppliers and companies
  useEffect(() => {
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
    return () => {
      mounted = false;
    };
  }, []);

  // Preload inventory summary
  useEffect(() => {
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
  }, []);

  const suppliersRef = useRef(suppliers);
  suppliersRef.current = suppliers;

  // Handle supplier selection
  const handleSupplierChange = useCallback(async (supplierId: string) => {
    const supplier = suppliersRef.current.find((s) => s.id === supplierId);
    if (supplier) {
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

      fetchInventoryItems(assignedCompanyNames, true);
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

  // Fetch low/out of stock inventory items for selected companies
  const fetchInventoryItems = async (
    companyNames: string[],
    clearExisting: boolean = false,
  ) => {
    setLoadingLowStock(true);
    try {
      const res: any = await pharmacyApi.getPurchaseOrderInventorySuggestions(
        "", // empty query = all items
        2000,
        companyNames,
        "low", // only low/out of stock items
      );
      const allItems: any[] = res?.items || [];

      let filteredItems = allItems;
      const lowerCompanyNames = companyNames.map((c) => c.toLowerCase().trim());

      if (lowerCompanyNames.length > 0) {
        filteredItems = allItems.filter((it: any) => {
          const mfg = String(
            it.manufacturer || it.companyName || it.company || "",
          )
            .trim()
            .toLowerCase();
          return lowerCompanyNames.includes(mfg);
        });
      } else {
        // If no companies selected, don't show any auto-suggestions
        filteredItems = [];
      }

      const supplierRequired = filteredItems.map((it: any) => ({
        id: it._id || it.id,
        name: it.name,
        genericName: it.genericName,
        category: it.category,
        unitsPerPack: it.unitsPerPack,
        onHand: it.onHand,
        minPackStock: it.minPackStock,
        minStock: it.minStock,
        maxPackAllow: it.maxPackAllow,
        lastSalePrice: it.lastSalePerPack || it.lastSalePerUnit || 0,
        lastBuyPerPack: it.lastBuyPerPack,
        lastSupplier: it.manufacturer || it.companyName || it.company || "",
      }));
      setLowStockForSupplier(supplierRequired);
    } catch (e) {
      console.error("Error loading inventory:", e);
    } finally {
      setLoadingLowStock(false);
    }
  };

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
          fetchInventoryItems(next);
          return next;
        });
      }
    },
    [companies],
  );

  const removeCompany = (name: string) => {
    setSelectedCompanyNames((prev) => {
      const next = prev.filter((n) => n !== name);
      setFormData((p) => ({ ...p, companyName: next.join(", ") }));
      fetchInventoryItems(next, true);

      // Also remove items from the list that belong to this company
      setItems((currentItems) => {
        const filtered = currentItems.filter((item) => {
          // Keep items that don't have a category (manual entries)
          // or items that don't match the removed company's name
          // Since we don't have a direct 'company' field on PurchaseOrderItem,
          // we check if the item's manufacturer/lastSupplier (stored in lowStockForSupplier)
          // matches the removed name.
          const sourceItem = lowStockForSupplier.find(
            (ls) => ls.id === item.inventoryItemId,
          );
          if (sourceItem) {
            return sourceItem.lastSupplier !== name;
          }
          return true;
        });

        return filtered.length > 0
          ? filtered
          : [
              {
                id: crypto.randomUUID(),
                name: "",
                quantity: 1,
                unit: "packs",
                estimatedUnitPrice: 0,
              },
            ];
      });

      return next;
    });
  };

  const searchInventory = useCallback(
    async (query: string, itemIndex: number) => {
      const assignedCompanies = selectedCompanyNames.map((c) =>
        c.toLowerCase(),
      );
      if (!query.trim()) {
        if (
          formData.supplierName &&
          formData.supplierId &&
          formData.supplierId !== "custom" &&
          assignedCompanies.length > 0
        ) {
          const supplierItems = inventoryDrugOptions
            .filter((d: any) => {
              const mfg = String(
                d.manufacturer || d.companyName || d.company || "",
              )
                .trim()
                .toLowerCase();
              return assignedCompanies.includes(mfg);
            })
            .map((d: any) => ({
              id: d._id || d.id || d.name?.toLowerCase?.(),
              name: d.name,
              genericName: d.lastGenericName || d.genericName,
              category: d.category,
              unitsPerPack: d.unitsPerPack,
              minPackStock: d.minPackStock,
              minStock: d.minStock,
              maxPackAllow: d.maxPackAllow,
              onHand: d.onHand,
              lastSalePrice: d.lastSalePerPack || d.lastSalePerUnit,
              lastBuyPerPack: d.lastBuyPerPack,
              lastSupplier:
                d.manufacturer || d.companyName || d.company || d.lastSupplier,
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

  const handleItemNameChange = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], name: value };
    setItems(newItems);
    setHighlightedSuggestionIndex((prev) => ({ ...prev, [index]: 0 }));
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      searchInventory(value, index);
    }, 300);
  };

  const selectSuggestion = (index: number, suggestion: InventorySuggestion) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      inventoryItemId: suggestion.id,
      name: suggestion.name,
      genericName: suggestion.genericName,
      category: suggestion.category,
      availableOnHand: suggestion.onHand,
      minPackStock: suggestion.minPackStock,
      maxPackAllow: suggestion.maxPackAllow,
      quantity: suggestion.maxPackAllow || 1,
      estimatedUnitPrice:
        suggestion.lastBuyPerPack || suggestion.lastSalePrice || 0,
    };
    setItems(newItems);
    setShowSuggestions((prev) => ({ ...prev, [index]: false }));
    setInventorySuggestions((prev) => ({ ...prev, [index]: [] }));
  };

  const addItem = useCallback(() => {
    const newIndex = items.length;
    setItems((prev) => [
      ...prev,
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
      lastItemNameRef.current?.focus();
    }, 50);
  }, [items.length, searchInventory]);

  const [selectedLowStockIds, setSelectedLowStockIds] = useState<Set<string>>(
    new Set(),
  );
  const [lastFocusedIndex, setLastFocusedIndex] = useState<number>(-1);

  const toggleLowStockSelection = (id: string) => {
    setSelectedLowStockIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addSelectedLowStockItems = () => {
    const itemsToAdd = lowStockForSupplier.filter((it) =>
      selectedLowStockIds.has(it.id),
    );
    if (itemsToAdd.length === 0) return;

    setItems((prev) => {
      let currentItems = [...prev];
      if (currentItems.length === 1 && !currentItems[0].name.trim()) {
        currentItems = [];
      }

      const existingIds = new Set(currentItems.map((it) => it.inventoryItemId));
      const newEntries = itemsToAdd
        .filter((it) => !existingIds.has(it.id))
        .map((it) => {
          const minPk =
            it.minPackStock ||
            (it.unitsPerPack && it.minStock
              ? Math.ceil(it.minStock / it.unitsPerPack)
              : 0);
          const qtyNeeded = Math.max(
            1,
            Number(minPk || 0) -
              Math.floor(Number(it.onHand || 0) / Number(it.unitsPerPack || 1)),
          );
          return {
            id: crypto.randomUUID(),
            inventoryItemId: it.id,
            name: it.name,
            genericName: it.genericName,
            category: it.category,
            availableOnHand: it.onHand,
            minPackStock: minPk,
            maxPackAllow: it.maxPackAllow,
            quantity: it.maxPackAllow || qtyNeeded,
            unit: "packs",
            estimatedUnitPrice: it.lastBuyPerPack || it.lastSalePrice || 0,
          };
        });

      return [...currentItems, ...newEntries];
    });
    setSelectedLowStockIds(new Set());
  };

  const addAllLowStockItems = () => {
    setItems((prev) => {
      let currentItems = [...prev];
      if (currentItems.length === 1 && !currentItems[0].name.trim()) {
        currentItems = [];
      }

      const existingIds = new Set(currentItems.map((it) => it.inventoryItemId));
      const newEntries = lowStockForSupplier
        .filter((it) => !existingIds.has(it.id))
        .map((it) => {
          const minPk =
            it.minPackStock ||
            (it.unitsPerPack && it.minStock
              ? Math.ceil(it.minStock / it.unitsPerPack)
              : 0);
          const qtyNeeded = Math.max(
            1,
            Number(minPk || 0) -
              Math.floor(Number(it.onHand || 0) / Number(it.unitsPerPack || 1)),
          );
          return {
            id: crypto.randomUUID(),
            inventoryItemId: it.id,
            name: it.name,
            genericName: it.genericName,
            category: it.category,
            availableOnHand: it.onHand,
            minPackStock: minPk,
            maxPackAllow: it.maxPackAllow,
            quantity: it.maxPackAllow || qtyNeeded,
            unit: "packs",
            estimatedUnitPrice: it.lastBuyPerPack || it.lastSalePrice || 0,
          };
        });

      return [...currentItems, ...newEntries];
    });
  };

  // Keyboard shortcut for adding item (Alt + N) and removing (Delete/Backspace on focused row)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        addItem();
      }

      // Remove item with Delete key if an item is focused and not in an input
      if (e.key === "Delete" && lastFocusedIndex !== -1) {
        const target = e.target as HTMLElement;
        if (
          target.tagName !== "INPUT" &&
          target.tagName !== "TEXTAREA" &&
          target.tagName !== "SELECT"
        ) {
          removeItem(lastFocusedIndex);
          setLastFocusedIndex(-1);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [addItem, lastFocusedIndex, items.length]);

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

  const updateItem = (
    index: number,
    field: keyof PurchaseOrderItem,
    value: any,
  ) => {
    const newItems = [...items];
    const currentItem = newItems[index];

    newItems[index] = { ...currentItem, [field]: value };

    // Auto-populate maxPackAllow from quantity if unit is 'packs'
    if (
      field === "quantity" &&
      (currentItem.unit === "packs" || !currentItem.unit)
    ) {
      const qty = Number(value || 0);
      if (
        currentItem.maxPackAllow === undefined ||
        currentItem.maxPackAllow === 0 ||
        currentItem.maxPackAllow === null
      ) {
        newItems[index].maxPackAllow = qty;
      } else {
        // Sync if it was already auto-populated or if the user is typing
        newItems[index].maxPackAllow = qty;
      }
    }

    setItems(newItems);
  };

  const addLowStockItem = (item: InventorySuggestion) => {
    if (items.length === 1 && !items[0].name.trim()) {
      setItems([
        {
          id: crypto.randomUUID(),
          inventoryItemId: item.id,
          name: item.name,
          genericName: item.genericName,
          category: item.category,
          availableOnHand: item.onHand,
          minPackStock: item.minPackStock,
          maxPackAllow: item.maxPackAllow,
          quantity: item.maxPackAllow || 1,
          unit: "packs",
          estimatedUnitPrice: item.lastBuyPerPack || item.lastSalePrice || 0,
        },
      ]);
    } else {
      const exists = items.find((it) => it.inventoryItemId === item.id);
      if (exists) return;
      setItems([
        ...items,
        {
          id: crypto.randomUUID(),
          inventoryItemId: item.id,
          name: item.name,
          genericName: item.genericName,
          category: item.category,
          availableOnHand: item.onHand,
          minPackStock: item.minPackStock,
          maxPackAllow: item.maxPackAllow,
          quantity: item.maxPackAllow || 1,
          unit: "packs",
          estimatedUnitPrice: item.lastBuyPerPack || item.lastSalePrice || 0,
        },
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      items: validItems,
      supplierName:
        formData.supplierId === "custom"
          ? formData.supplierCustom
          : formData.supplierName,
      companyName: formData.companyName,
      date: formData.date || new Date().toISOString().split("T")[0],
    } as PurchaseOrder;

    try {
      if (isEditing) {
        await pharmacyApi.updatePurchaseOrder(id!, po);
      } else {
        await pharmacyApi.createPurchaseOrder(po);
      }
      navigate("/pharmacy/purchase-orders");
    } catch (e: any) {
      setAlertModal({
        open: true,
        title: "Error",
        message: e?.message || "Failed to save purchase order",
      });
    }
  };

  const handleSupplierSaved = (supplier: Supplier) => {
    setSuppliers((prev) => [...prev, supplier]);
    handleSupplierChange(supplier.id);
  };

  const handleCompanySaved = (company: Company) => {
    setCompanies((prev) => [...prev, company]);
    handleCompanyChange(company.id);
  };

  const isCustomSupplier = formData.supplierId === "custom";

  return (
    <div className="h-full bg-slate-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-gradient-to-r from-blue-800 to-blue-900 shrink-0 shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/pharmacy/purchase-orders")}
            className="rounded-lg p-2 text-white/80 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {isEditing ? "Edit Purchase Order" : "Create Purchase Order"}
              </h3>
              <p className="text-sm text-blue-100">
                Manage your inventory procurement
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/pharmacy/purchase-orders")}
            className="rounded-lg border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-900/20"
          >
            {isEditing ? "Update Order" : "Create Order"}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 bg-white border-b border-slate-200 shadow-sm p-4 lg:p-5">
          <div className="max-w-[1800px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
            {/* Schedule */}
            <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 transition-all hover:shadow-md hover:border-blue-200 group">
              <h4 className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-widest">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Calendar className="h-4 w-4" />
                </div>
                Schedule
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">
                    Order Date
                  </label>
                  <input
                    ref={orderDateRef}
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none bg-white transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1">
                    Exp. Delivery
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
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none bg-white transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Supplier */}
            <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 transition-all hover:shadow-md hover:border-blue-200 group">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-widest">
                  <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Truck className="h-4 w-4" />
                  </div>
                  Supplier
                </h4>
                <button
                  type="button"
                  onClick={() => setAddSupplierOpen(true)}
                  className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-tight bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors"
                >
                  + New
                </button>
              </div>
              <div className="relative">
                <select
                  value={formData.supplierId || ""}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none bg-white pr-8 transition-all shadow-sm cursor-pointer"
                >
                  <option value="">— Choose Supplier —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                  <option value="custom">+ Custom Supplier</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
              {formData.supplierName && !isCustomSupplier && (
                <div className="flex items-center gap-2 text-xs text-blue-800 font-bold bg-blue-100/50 px-3 py-2 rounded-xl border border-blue-200/50 animate-in fade-in slide-in-from-top-1">
                  <Phone className="h-4 w-4 text-blue-500" />
                  {formData.contactPhone || "No Phone Number"}
                </div>
              )}
            </div>

            {/* Companies */}
            <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 transition-all hover:shadow-md hover:border-blue-200 group">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-widest">
                  <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <Building2 className="h-4 w-4" />
                  </div>
                  Companies
                </h4>
                <button
                  type="button"
                  onClick={() => setAddCompanyOpen(true)}
                  className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-tight bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors"
                >
                  + New
                </button>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <select
                    value={formData.companyId || ""}
                    onChange={(e) => handleCompanyChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-black focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none appearance-none bg-white pr-8 transition-all shadow-sm cursor-pointer"
                  >
                    <option value="">— Add Company —</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="custom">+ Custom Company</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-[60px] overflow-y-auto content-start scrollbar-hide">
                  {selectedCompanyNames.map((name) => (
                    <div
                      key={name}
                      className="flex items-center gap-1.5 rounded-full bg-white border border-blue-100 px-2.5 py-1 text-[10px] font-black text-blue-800 group shadow-sm hover:border-blue-300 transition-all"
                    >
                      {name}
                      <button
                        onClick={() => removeCompany(name)}
                        className="hover:text-rose-600 transition-colors p-0.5 rounded-full hover:bg-rose-50"
                      >
                        <Plus className="h-2.5 w-2.5 rotate-45" />
                      </button>
                    </div>
                  ))}
                  {selectedCompanyNames.length === 0 && (
                    <span className="text-[9px] text-slate-400 font-medium italic px-1">
                      No companies selected
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 transition-all hover:shadow-md hover:border-blue-200 group">
              <h4 className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-widest">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <MapPin className="h-4 w-4" />
                </div>
                Delivery Address
              </h4>
              <textarea
                value={formData.shippingAddress || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    shippingAddress: e.target.value,
                  }))
                }
                placeholder="Full delivery address..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none bg-white resize-none h-[68px] shadow-sm transition-all hover:border-blue-200"
              />
            </div>

            {/* Notes */}
            <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 transition-all hover:shadow-md hover:border-blue-200 group">
              <h4 className="flex items-center gap-2 text-xs font-black text-slate-800 uppercase tracking-widest">
                <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <FileText className="h-4 w-4" />
                </div>
                Notes
              </h4>
              <textarea
                value={formData.notes || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Internal references..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none bg-white resize-none h-[68px] shadow-sm transition-all hover:border-blue-200"
              />
            </div>
          </div>
        </div>

        {/* Bottom Section: Items Table */}
        <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            {/* Left Column: Items List */}
            <div className="flex-1 flex flex-col border-r border-slate-200 bg-white min-w-0">
              <div className="p-3 lg:p-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 gap-3">
                <div className="flex items-center gap-3 lg:gap-6 flex-1 min-w-0">
                  <h4 className="flex items-center gap-2 text-sm lg:text-base font-black text-slate-900 uppercase tracking-tight whitespace-nowrap">
                    <Package className="h-5 w-5 text-blue-600" />
                    Order Items ({items.length})
                  </h4>
                  <div className="relative flex-1 max-w-md hidden sm:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search items in order..."
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2 text-xs font-bold focus:border-blue-500 outline-none bg-slate-50/50 transition-all"
                    />
                  </div>
                  {lowStockForSupplier.length > 0 && (
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-full border border-amber-200 shadow-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest">
                        {lowStockForSupplier.length} Stock Alerts
                      </span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-1.5 lg:gap-2 rounded-xl bg-blue-600 px-3 lg:px-5 py-2 lg:py-2.5 text-[10px] lg:text-xs font-black text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/10 active:scale-95 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Item</span>
                  <span className="sm:hidden">Add</span>
                  <span className="hidden lg:inline">(Alt+N)</span>
                </button>
              </div>

              {/* Items Table - horizontally scrollable on small screens */}
              <div className="flex-1 overflow-auto bg-slate-50/30">
                <div className="min-w-[900px] lg:min-w-0">
                  {/* Table Header */}
                  <div className="px-4 lg:px-6 py-3 bg-slate-50 border-b border-slate-200 grid grid-cols-[2fr_1.5fr_80px_100px_140px_120px_80px_100px_40px] gap-3 text-[10px] lg:text-xs font-black text-slate-600 uppercase tracking-widest items-center shrink-0">
                    <div>Item Name</div>
                    <div>Generic</div>
                    <div className="text-center">Qty</div>
                    <div>Unit</div>
                    <div>Purchase Price</div>
                    <div>Category</div>
                    <div className="text-center">Max Pk</div>
                    <div className="text-right">Subtotal</div>
                    <div />
                  </div>

                  {/* Table Body */}
                  <div className="p-3 lg:p-4 space-y-2">
                  {items
                    .filter(
                      (item) =>
                        !orderSearchQuery ||
                        item.name
                          .toLowerCase()
                          .includes(orderSearchQuery.toLowerCase()) ||
                        item.genericName
                          ?.toLowerCase()
                          .includes(orderSearchQuery.toLowerCase()),
                    )
                    .map((item, index) => (
                      <div
                        key={item.id}
                        tabIndex={0}
                        onFocus={() => setLastFocusedIndex(index)}
                        className={`group rounded-xl border px-5 py-3 shadow-sm transition-all hover:border-blue-400 hover:shadow-md relative ${lastFocusedIndex === index ? "border-blue-500 bg-blue-50/30" : "border-slate-200 bg-white"}`}
                      >
                        <div className="grid grid-cols-[2fr_1.5fr_80px_100px_140px_120px_80px_100px_40px] gap-3 items-center">
                          {/* Item Name */}
                          <div className="relative min-w-0">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <input
                                type="text"
                                ref={
                                  index === 0
                                    ? firstItemNameRef
                                    : index === items.length - 1
                                      ? lastItemNameRef
                                      : null
                                }
                                value={item.name}
                                onChange={(e) =>
                                  handleItemNameChange(index, e.target.value)
                                }
                                onFocus={() => {
                                  if (item.name)
                                    searchInventory(item.name, index);
                                }}
                                onKeyDown={(e) => {
                                  const suggestions =
                                    inventorySuggestions[index] || [];
                                  if (
                                    !showSuggestions[index] ||
                                    suggestions.length === 0
                                  )
                                    return;

                                  const currentHighlighted =
                                    highlightedSuggestionIndex[index] || 0;

                                  if (e.key === "ArrowDown") {
                                    e.preventDefault();
                                    setHighlightedSuggestionIndex((prev) => ({
                                      ...prev,
                                      [index]: Math.min(
                                        currentHighlighted + 1,
                                        suggestions.length - 1,
                                      ),
                                    }));
                                  } else if (e.key === "ArrowUp") {
                                    e.preventDefault();
                                    setHighlightedSuggestionIndex((prev) => ({
                                      ...prev,
                                      [index]: Math.max(
                                        currentHighlighted - 1,
                                        0,
                                      ),
                                    }));
                                  } else if (e.key === "Enter") {
                                    e.preventDefault();
                                    const selectedSuggestion =
                                      suggestions[currentHighlighted];
                                    if (selectedSuggestion) {
                                      selectSuggestion(
                                        index,
                                        selectedSuggestion,
                                      );
                                    }
                                  } else if (e.key === "Escape") {
                                    setShowSuggestions((prev) => ({
                                      ...prev,
                                      [index]: false,
                                    }));
                                  }
                                }}
                                placeholder="Search..."
                                required
                                className="w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2 text-sm font-bold focus:border-blue-500 outline-none transition-all bg-slate-50/50"
                              />
                            </div>
                            {showSuggestions[index] &&
                              inventorySuggestions[index]?.length > 0 && (
                                <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[280px] rounded-xl border border-slate-200 bg-white shadow-2xl max-h-64 overflow-y-auto py-2">
                                  {inventorySuggestions[index].map(
                                    (suggestion, sIndex) => {
                                      const isHighlighted =
                                        sIndex ===
                                        (highlightedSuggestionIndex[index] ||
                                          0);
                                      return (
                                        <button
                                          key={suggestion.id}
                                          type="button"
                                          onClick={() =>
                                            selectSuggestion(index, suggestion)
                                          }
                                          onMouseEnter={() =>
                                            setHighlightedSuggestionIndex(
                                              (prev) => ({
                                                ...prev,
                                                [index]: sIndex,
                                              }),
                                            )
                                          }
                                          className={`w-full px-4 py-2.5 text-left transition-colors group/item ${isHighlighted ? "bg-blue-50" : "hover:bg-blue-50"}`}
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <div
                                              className={`font-bold text-sm ${isHighlighted ? "text-blue-700" : "text-slate-800 group-hover/item:text-blue-700"}`}
                                            >
                                              {suggestion.name}
                                            </div>
                                            <div className="flex items-center gap-2">
                                              {suggestion.maxPackAllow && (
                                                <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700 uppercase">
                                                  Max: {suggestion.maxPackAllow}
                                                </span>
                                              )}
                                              {suggestion.lastSupplier &&
                                                suggestion.lastSupplier.toLowerCase() ===
                                                  formData.supplierName?.toLowerCase() && (
                                                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700 uppercase">
                                                    Match
                                                  </span>
                                                )}
                                            </div>
                                          </div>
                                        </button>
                                      );
                                    },
                                  )}
                                </div>
                              )}
                          </div>

                          {/* Generic */}
                          <div className="min-w-0">
                            <input
                              type="text"
                              value={item.genericName || ""}
                              onChange={(e) =>
                                updateItem(index, "genericName", e.target.value)
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium focus:border-blue-500 outline-none bg-slate-50/50"
                              placeholder="Generic"
                            />
                          </div>

                          {/* Qty */}
                          <div className="min-w-0">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  "quantity",
                                  parseInt(e.target.value) || 0,
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-black focus:border-blue-500 outline-none text-center bg-slate-50/50"
                            />
                          </div>

                          {/* Unit */}
                          <div className="min-w-0">
                            <select
                              value={item.unit || "packs"}
                              onChange={(e) =>
                                updateItem(index, "unit", e.target.value)
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold focus:border-blue-500 outline-none bg-white appearance-none"
                            >
                              <option value="packs">Packs</option>
                              <option value="units">Units</option>
                              <option value="boxes">Boxes</option>
                              <option value="bottles">Bottles</option>
                            </select>
                          </div>

                          {/* Purchase Price */}
                          <div className="min-w-0">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
                                Rs
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                value={item.estimatedUnitPrice}
                                onChange={(e) =>
                                  updateItem(
                                    index,
                                    "estimatedUnitPrice",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm font-black text-emerald-700 focus:border-emerald-500 outline-none bg-slate-50/50"
                              />
                            </div>
                          </div>

                          {/* Category */}
                          <div className="min-w-0">
                            <input
                              type="text"
                              value={item.category || ""}
                              onChange={(e) =>
                                updateItem(index, "category", e.target.value)
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold focus:border-blue-500 outline-none transition-all bg-slate-50/50"
                            />
                          </div>

                          {/* Max Pack Allow */}
                          <div className="min-w-0">
                            <input
                              type="number"
                              value={item.maxPackAllow ?? ""}
                              onChange={(e) =>
                                updateItem(
                                  index,
                                  "maxPackAllow",
                                  Number(e.target.value || 0),
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold focus:border-blue-500 outline-none transition-all bg-slate-50/50 text-center"
                              placeholder="-"
                            />
                          </div>

                          {/* Subtotal */}
                          <div className="min-w-0 text-right">
                            <span className="text-xs font-black text-blue-700">
                              Rs{" "}
                              {(
                                (item.quantity || 0) *
                                (item.estimatedUnitPrice || 0)
                              ).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>

                          {/* Remove */}
                          <div className="min-w-0 text-center">
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors opacity-60 hover:opacity-100"
                              title="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Stock Info (Compact) */}
                        <div className="mt-1 flex items-center gap-4 text-[10px] font-bold text-slate-400 pl-2">
                          <span>
                            Stock:{" "}
                            <span className="text-slate-600">
                              {item.availableOnHand ?? 0}
                            </span>
                          </span>
                          <span>
                            Min (pk):{" "}
                            <span className="text-slate-600">
                              {item.minPackStock ?? 0}
                            </span>
                          </span>
                          <span>
                            Max (pk):{" "}
                            <span className="text-slate-600">
                              {item.maxPackAllow ?? 0}
                            </span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Enhanced Footer Summary */}
              <div className="p-3 lg:p-4 border-t border-slate-200 bg-white shrink-0 shadow-[0_-1px_4px_rgba(0,0,0,0.06)]">
                <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <span>Unique Items:</span>
                      <span className="font-bold text-slate-700">
                        {items.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <span>Total Volume:</span>
                      <span className="font-bold text-slate-700">
                        {items.reduce((sum, it) => sum + (it.quantity || 0), 0)}{" "}
                        Units
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    {/* Empty space for potential mid-footer content */}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Grand Total Estimate
                    </span>
                    <span className="text-3xl font-black text-blue-700">
                      Rs{" "}
                      {items
                        .reduce(
                          (sum, it) =>
                            sum +
                            (it.quantity || 0) * (it.estimatedUnitPrice || 0),
                          0,
                        )
                        .toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Dynamic Recommendations (Low Stock) */}
            {lowStockForSupplier.length > 0 && (
              <div className="hidden xl:flex xl:w-80 bg-slate-50 border-l border-slate-200 flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-white space-y-3">
                  <h4 className="flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-widest">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Quick Add Low Stock
                  </h4>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search low stock..."
                      value={lowStockSearchQuery}
                      onChange={(e) => setLowStockSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-[10px] font-bold focus:border-blue-500 outline-none bg-slate-50 transition-all"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={addSelectedLowStockItems}
                      disabled={selectedLowStockIds.size === 0}
                      className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-black text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase tracking-tighter"
                    >
                      Add Selected ({selectedLowStockIds.size})
                    </button>
                    <button
                      type="button"
                      onClick={addAllLowStockItems}
                      className="flex-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-black text-blue-700 hover:bg-blue-100 transition-all uppercase tracking-tighter"
                    >
                      Add All
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {lowStockForSupplier
                    .filter(
                      (it) =>
                        !lowStockSearchQuery ||
                        it.name
                          .toLowerCase()
                          .includes(lowStockSearchQuery.toLowerCase()) ||
                        it.genericName
                          ?.toLowerCase()
                          .includes(lowStockSearchQuery.toLowerCase()),
                    )
                    .map((it) => {
                      const inCart = items.some(
                        (cartItem) => cartItem.inventoryItemId === it.id,
                      );
                      const isSelected = selectedLowStockIds.has(it.id);
                      return (
                        <div
                          key={it.id}
                          className={`relative flex flex-col items-start rounded-xl border p-3 text-left transition-all hover:shadow-md group ${
                            inCart
                              ? "bg-slate-100 border-slate-200 opacity-60"
                              : "bg-white border-slate-200 hover:border-blue-300"
                          } ${isSelected ? "ring-2 ring-blue-500 border-transparent" : ""}`}
                        >
                          <div className="flex items-start justify-between w-full gap-2">
                            <button
                              type="button"
                              disabled={inCart}
                              onClick={() => toggleLowStockSelection(it.id)}
                              className="flex-1 text-left outline-none"
                            >
                              <span className="text-xs font-bold text-slate-800 line-clamp-2">
                                {it.name}
                              </span>
                            </button>
                            {!inCart && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleLowStockSelection(it.id)}
                                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                            )}
                          </div>
                          <div className="mt-2 flex items-center justify-between w-full">
                            <span className="text-[10px] text-amber-700 font-bold">
                              Stock: {it.onHand}
                            </span>
                            {!inCart && (
                              <button
                                type="button"
                                onClick={() => addLowStockItem(it)}
                                className="p-1 rounded-md hover:bg-blue-50 text-blue-600 transition-colors"
                                title="Add instantly"
                              >
                                <Plus className="h-3.5 w-3.5 group-hover:scale-125 transition-transform" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
            <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
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
