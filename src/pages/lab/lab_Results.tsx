import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  Plus,
  Barcode,
  Building2,
  Clock,
  FlaskConical,
  User,
  CalendarDays,
  FileCheck,
  Printer,
  Save,
  Send,
  AlertTriangle,
  X,
  ChevronRight,
  ChevronDown,
  Activity,
  ListChecks,
  CheckCircle2,
  Eye,
} from "lucide-react";
import { labApi, corporateApi } from "../../utils/api";
import { useSearchParams, useNavigate } from "react-router-dom";
import { previewLabReportPdf } from "../../utils/printLabReport";
import Lab_TrackDialog from "../../components/lab/lab_TrackDialog";
import ChatGPTHandoffButton from "../../components/lab/ChatGPTHandoffButton";
import RepeatSampleModal from "../../components/lab/modals/RepeatSampleModal";
import TestHistoryModal from "../../components/lab/modals/TestHistoryModal";
import CriticalResultDetailModal from "../../components/lab/modals/CriticalResultDetailModal";
import MiniDashboard from "../../components/common/MiniDashboard";
import { useLabSession } from "../../hooks/useLabSession";
import { api } from "../../api";
import Toast, { type ToastState } from "../../components/ui/Toast";

type LabTest = {
  id: string;
  name: string;
  price: number;
  parameter?: string;
  unit?: string;
  normalRangeMale?: string;
  normalRangeFemale?: string;
  normalRangePediatric?: string;
  parameters?: Array<{
    name: string;
    unit?: string;
    normalRangeMale?: string;
    normalRangeFemale?: string;
    normalRangePediatric?: string;
    formula?: string;
    dependencies?: string[];
    kind?: "quantitative" | "qualitative";
    criticalMin?: number;
    criticalMax?: number;
    sectionKey?: string;
    qualitativeOptions?: string[];
    interpretationRules?: Array<{
      expression: string;
      label?: string;
      text?: string;
    }>;
    decimals?: number;
  }>;
  template?: string;
  sections?: Array<{ key: string; title: string; order?: number }>;
};

type Order = {
  id: string;
  patientId?: string;
  createdAt: string;
  patient: {
    fullName: string;
    phone: string;
    cnic?: string;
    guardianName?: string;
    age?: string;
    gender?: string;
    mrn?: string;
    address?: string;
  };
  tests: Array<string | { testId: string; testName: string; price: number }>;
  testStatuses?: Array<{
    testId: string;
    testName: string;
    status:
      | "pending"
      | "sample_collected"
      | "in_progress"
      | "result_entered"
      | "approved"
      | "completed"
      | "returned";
    resultId?: string;
  }>;
  status:
    | "received"
    | "result_entered"
    | "approved"
    | "completed"
    | "cancelled";
  tokenNo?: string;
  sampleTime?: string;
  reportingTime?: string;
  returnedTests?: Array<
    string | { testId: string; testName: string; price: number }
  >;
  referringConsultant?: string;
  barcode?: string;
  sampleType?: "normal" | "urgent" | "stat";
  corporateId?: string;
  corporateName?: string;
  corporatePreAuthNo?: string;
  billingType?: "cash" | "corporate";
};

type Track = {
  status:
    | "received"
    | "result_entered"
    | "approved"
    | "completed"
    | "cancelled";
  sampleTime?: string;
  reportingTime?: string;
  tokenNo: string;
};

type ResultRow = {
  id: string;
  test: string;
  normal?: string;
  unit?: string;
  prevValue?: string;
  value?: string;
  flag?:
    | "normal"
    | "abnormal"
    | "abnormal_low"
    | "abnormal_high"
    | "critical"
    | "critical_low"
    | "critical_high";
  comment?: string;
  formula?: string;
  dependencies?: string[];
  isCalculated?: boolean;
  lockedMeta?: boolean;
  kind?: "quantitative" | "qualitative";
  qualitativeOptions?: string[];
  criticalMin?: number;
  criticalMax?: number;
  sectionKey?: string;
  interpretationRules?: Array<{
    expression: string;
    label?: string;
    text?: string;
  }>;
  decimals?: number;
};

function parseRange(r?: string) {
  if (!r) return null;
  const m = r.match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/);
  if (!m) return null;
  return { min: Number(m[1]), max: Number(m[2]) };
}

function autoFlagForRow(r: ResultRow): ResultRow["flag"] | undefined {
  if (!r.value) return undefined;
  const num = Number(r.value);
  if (Number.isNaN(num)) return undefined;
  // Critical range check (directional)
  if (
    r.criticalMin != null &&
    Number.isFinite(r.criticalMin) &&
    num <= r.criticalMin
  )
    return "critical_low";
  if (
    r.criticalMax != null &&
    Number.isFinite(r.criticalMax) &&
    num >= r.criticalMax
  )
    return "critical_high";
  const range = parseRange(r.normal);
  if (!range) return undefined;
  if (num < range.min) return "abnormal_low";
  if (num > range.max) return "abnormal_high";
  return "normal";
}

export function buildPrintRows(sourceRows: any[], testDef: any) {
  const sections = testDef?.sections || [];
  const unsectioned: any[] = [];
  const sectionGroups: Record<string, any[]> = {};
  for (const r of sourceRows) {
    const sk = r.sectionKey || "";
    if (!sk) unsectioned.push(r);
    else {
      if (!sectionGroups[sk]) sectionGroups[sk] = [];
      sectionGroups[sk].push(r);
    }
  }

  const out: any[] = [];
  const mapRow = (r: any) => ({
    test: r.test,
    normal: r.normal,
    unit: r.unit,
    value: r.value,
    prevValue: r.prevValue,
    flag:
      r.flag === "critical_low" || r.flag === "critical_high"
        ? "critical"
        : r.flag === "abnormal_low" || r.flag === "abnormal_high"
          ? "abnormal"
          : r.flag,
    comment: r.comment,
    profile: r.profile,
  });

  unsectioned.forEach((r) => out.push(mapRow(r)));

  sections.forEach((sec: any) => {
    const secRows = sectionGroups[sec.key] || [];
    if (secRows.length > 0) {
      out.push({ isSection: true, test: sec.title });
      secRows.forEach((r) => out.push(mapRow(r)));
    }
  });
  return out;
}

function genId() {
  // Cross-browser compatible UUID generator
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString() + ", " + d.toLocaleTimeString();
}

function genBarcode(order: Order) {
  const d = new Date(order.createdAt);
  const y = d.getFullYear();
  const part = String(order.tokenNo || order.id || "")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_-]/gi, "");
  return `BC-${y}-${part}`;
}

function genToken(dateIso: string, id: string) {
  const d = new Date(dateIso);
  const part = `${d.getDate().toString().padStart(2, "0")}${(d.getMonth() + 1).toString().padStart(2, "0")}${d.getFullYear()}`;
  return `D${part}_${id.slice(-3)}`;
}

export default function Lab_Results() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const returnTo = searchParams.get("returnTo") || "";
  const [orders, setOrders] = useState<Order[]>([]);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [track, setTrack] = useState<Record<string, Track>>({});
  const [tick, setTick] = useState(0);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [companies, setCompanies] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [trackOpen, setTrackOpen] = useState(false);
  const [trackTokenNo, setTrackTokenNo] = useState<string | null>(null);
  // Pagination and search for sample selection (must be declared before effects that use them)
  const [q, setQ] = useState("");
  const [rowsPer, setRowsPer] = useState(10);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<
    | "all"
    | "pending"
    | "sample_collected"
    | "in_progress"
    | "result_entered"
    | "approved"
    | "returned"
    | "outsourced"
    | "dispatched"
    | "completed"
  >("all");

  const session = useLabSession();
  useEffect(() => {
    function onReturn() {
      setTick((t) => t + 1);
    }
    window.addEventListener("lab:return", onReturn as any);
    return () => {
      window.removeEventListener("lab:return", onReturn as any);
    };
  }, []);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res: any = await corporateApi.listCompanies();
        if (!mounted) return;
        setCompanies(
          (res?.companies || []).map((c: any) => ({
            id: String(c._id || c.id),
            name: c.name,
          })),
        );
      } catch {
        setCompanies([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [ordersRes, testsRes] = await Promise.all([
          labApi.listOrders({ q: q || undefined, limit: rowsPer, page }),
          labApi.listTests({ limit: 1000 }),
        ]);
        if (!mounted) return;
        const o: Order[] = (ordersRes.items || [])
          .map((x: any) => ({
            id: x._id,
            patientId: x.patientId || undefined,
            createdAt: x.createdAt || new Date().toISOString(),
            patient: x.patient || { fullName: "-", phone: "" },
            tests: x.tests || [],
            testStatuses: x.testStatuses || [],
            status: x.status || "received",
            tokenNo: x.tokenNo,
            barcode: x.barcode,
            sampleTime: x.sampleTime,
            reportingTime: x.reportingTime,
            returnedTests: Array.isArray(x.returnedTests)
              ? x.returnedTests
              : [],
            referringConsultant: x.referringConsultant,
            corporateId: x.corporateId,
            corporateName: x.corporateName,
            corporatePreAuthNo: x.corporatePreAuthNo,
            billingType:
              x.billingType || (x.corporateId ? "corporate" : "cash"),
          }))
          .filter(
            (x: any) => String((x as any)?.barcode || "").trim().length > 0,
          )
          .filter((x: any) => String((x as any)?.status || "") !== "completed");
        setOrders(o);
        setTotal(Number(ordersRes.total || o.length || 0));
        setTotalPages(Number(ordersRes.totalPages || 1));
        setTrack(
          Object.fromEntries(
            o.map((od) => [
              od.id,
              {
                status: od.status,
                tokenNo: od.tokenNo || genToken(od.createdAt, od.id),
                sampleTime: od.sampleTime,
                reportingTime: od.reportingTime,
              } as Track,
            ]),
          ),
        );
        setTests(
          (testsRes.items || []).map((t: any) => ({
            id: t._id,
            name: t.name,
            price: Number(t.price || 0),
            parameter: t.parameter,
            unit: t.unit,
            normalRangeMale: t.normalRangeMale,
            normalRangeFemale: t.normalRangeFemale,
            normalRangePediatric: t.normalRangePediatric,
            parameters: Array.isArray(t.parameters) ? t.parameters : [],
            template: t.template || "general",
            sections: Array.isArray(t.sections) ? t.sections : [],
          })),
        );
      } catch (e) {
        console.error(e);
        setOrders([]);
        setTests([]);
        setTrack({});
        setTotal(0);
        setTotalPages(1);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [tick, q, page, rowsPer]);

  const testsMap = useMemo(
    () => Object.fromEntries(tests.map((t) => [t.id, t])),
    [tests],
  );

  // Step 1: Select sample
  const pageCount = totalPages;
  const curPage = Math.min(page, pageCount);
  const start = Math.min((curPage - 1) * rowsPer + 1, total);
  const end = Math.min((curPage - 1) * rowsPer + orders.length, total);
  const items = orders;

  const [selected, setSelected] = useState<Order | null>(null);
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [selectedOrderTestId, setSelectedOrderTestId] = useState<string | null>(
    null,
  );
  const [existingResultId, setExistingResultId] = useState<string | null>(null);

  // Step 2: Entry form
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [interpretation, setInterpretation] = useState("");
  const [referring, setReferring] = useState("");
  const [showRepeat, setShowRepeat] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<{
    code?: string;
    message: string;
    validation?: any;
  } | null>(null);
  const [pendingCriticalEvents, setPendingCriticalEvents] = useState<any[]>([]);
  const [toast, setToast] = useState<ToastState>(null);
  // Previous results for the same patient + test
  const [prior, setPrior] = useState<
    Array<{
      order: Order;
      result: {
        id: string;
        orderId: string;
        rows: any[];
        interpretation?: string;
        createdAt: string;
      };
    }>
  >([]);

  const onSelect = async (
    o: Order,
    testId: string,
    orderTestId: string | null = null,
  ) => {
    setSelected(o);
    setSelectedTestId(testId);
    setSelectedOrderTestId(orderTestId);
    setReferring(o.referringConsultant || "");
    setExistingResultId(null);
    setInterpretation("");

    // Try loading existing result for this order + test first
    try {
      const res: any = await labApi.listResults({ orderId: o.id, limit: 100 });
      const existing = (res.items || []).find(
        (r: any) =>
          (r.orderTestId &&
            orderTestId &&
            String(r.orderTestId) === String(orderTestId)) ||
          (r.testId && testId && String(r.testId) === String(testId)),
      );
      if (existing) {
        const loadedRows = (existing.rows || []).map((r: any) => ({
          id: String(r.id || r._id || genId()),
          test: r.test || "",
          normal: r.normal,
          unit: r.unit,
          prevValue: r.prevValue,
          value: r.value ?? "",
          flag: r.flag,
          comment: r.comment,
          formula: r.formula,
          dependencies: r.dependencies,
          isCalculated: !!r.formula,
          lockedMeta: r.lockedMeta ?? true,
          kind: r.kind || "quantitative",
          criticalMin: r.criticalMin,
          criticalMax: r.criticalMax,
          sectionKey: r.sectionKey,
          qualitativeOptions: r.qualitativeOptions,
          interpretationRules: r.interpretationRules,
          decimals: r.decimals ?? 2,
        }));
        setRows(calculateDerived(loadedRows, o.patient));
        setInterpretation(existing.interpretation || "");
        setExistingResultId(String(existing._id || existing.id));
        loadPreviousResults(o, testId);
        return;
      }
    } catch (e) {
      console.error("Failed to check existing result", e);
    }

    // No existing result — bootstrap rows from catalog for the selected test
    const initial: ResultRow[] = [];
    const t = testsMap[testId];
    if (t) {
      const params = Array.isArray(t.parameters) ? t.parameters : [];
      if (params.length) {
        const names = new Set<string>();
        for (const p of params) {
          initial.push({
            id: genId(),
            test: p.name || t.name,
            normal:
              p.normalRangeMale ||
              p.normalRangeFemale ||
              p.normalRangePediatric ||
              undefined,
            unit: p.unit || undefined,
            formula: p.formula,
            dependencies: p.dependencies,
            isCalculated: !!p.formula,
            lockedMeta: true,
            kind: p.kind || "quantitative",
            criticalMin: p.criticalMin,
            criticalMax: p.criticalMax,
            sectionKey: p.sectionKey || undefined,
            qualitativeOptions: p.qualitativeOptions || undefined,
            interpretationRules: p.interpretationRules || undefined,
            decimals: p.decimals ?? 2,
          });
          if (p.name) names.add(String(p.name));
        }
        if (
          (t.parameter || "").trim() &&
          !names.has(String(t.parameter).trim())
        ) {
          initial.push({
            id: genId(),
            test: String(t.parameter).trim(),
            normal:
              t.normalRangeMale ||
              t.normalRangeFemale ||
              t.normalRangePediatric ||
              undefined,
            unit: t.unit,
            lockedMeta: true,
            kind: "quantitative",
          });
        }
      } else {
        initial.push({
          id: genId(),
          test: t.parameter || t.name,
          normal:
            t.normalRangeMale ||
            t.normalRangeFemale ||
            t.normalRangePediatric ||
            undefined,
          unit: t.unit,
          lockedMeta: true,
          kind: "quantitative",
        });
      }
    }
    setRows(calculateDerived(initial, o.patient));
    // Load previous results for this patient + test and prefill prevValue column
    loadPreviousResults(o, testId);
  };

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      {
        id: genId(),
        test: "",
        normal: "",
        unit: "",
        value: "",
        comment: "",
        lockedMeta: false,
      },
    ]);
  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id));

  // Calculate derived parameters based on formulas
  const calculateDerived = (rows: ResultRow[], patient?: { age?: string; gender?: string }): ResultRow[] => {
    // Build a map of parameter names to values
    const valueMap: Record<string, number> = {};
    for (const r of rows) {
      const key = (r.test || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/gi, "_");
      const num = parseFloat(r.value || "");
      if (!isNaN(num)) valueMap[key] = num;
    }

    // Calculate derived values
    return rows.map((r) => {
      // Special case: eGFR uses patient age/gender (MDRD formula)
      const testName = (r.test || "").trim().toLowerCase();
      if (testName === 'egfr' && patient) {
        const scr = valueMap['serum_creatinine'] || valueMap['creatinine'];
        const age = parseFloat(patient.age || '');
        const isFemale = (patient.gender || '').toLowerCase() === 'female';
        if (scr && !isNaN(age) && age > 0) {
          let egfr = 186 * Math.pow(scr, -1.154) * Math.pow(age, -0.203);
          if (isFemale) egfr *= 0.742;
          return { ...r, value: egfr.toFixed(0), isCalculated: true };
        }
        return r;
      }

      if (!r.formula || !r.isCalculated) return r;

      try {
        // Extract variable names from formula (e.g., "LDL_C = TC - HDL - VLDL" or just "TC - HDL - VLDL")
        let formula = r.formula.trim();

        // If formula contains assignment (e.g., "LDL_C = TC - HDL"), extract the expression
        if (formula.includes("=")) {
          const parts = formula.split("=");
          formula = parts[parts.length - 1].trim();
        }

        // Replace variable names with values
        let expr = formula;
        for (const [key, val] of Object.entries(valueMap)) {
          // Match variable names (case-insensitive, word boundaries)
          const regex = new RegExp(
            `\\b${key.replace(/_/g, "[^a-z0-9]?")}\\b`,
            "gi",
          );
          expr = expr.replace(regex, String(val));
        }

        // Safely evaluate the expression
        // Only allow numbers, operators, parentheses, and decimal points
        if (!/^[\d\s+\-*/().]+$/.test(expr)) {
          return { ...r, value: "" };
        }

        // Use Function constructor for safe evaluation (no access to scope)
        const result = new Function(`return (${expr})`)();

        if (typeof result === "number" && !isNaN(result) && isFinite(result)) {
          return { ...r, value: result.toFixed(2) };
        }
        return { ...r, value: "" };
      } catch {
        return { ...r, value: "" };
      }
    });
  };

  // Update a row value and recalculate derived parameters
  const updateRowValue = (id: string, value: string) => {
    setRows((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, value } : r));
      return calculateDerived(updated, selected?.patient);
    });
  };

  const save = async (opts?: { strict?: boolean; approve?: boolean }) => {
    if (!selected || saving) return false;

    // Verification popup for already approved/completed results
    const selectedTestStatus = selected.testStatuses?.find(
      (ts) => String(ts.testId) === String(selectedTestId),
    )?.status;
    if (
      selectedTestStatus === "approved" ||
      selectedTestStatus === "completed"
    ) {
      const confirmUpdate = window.confirm(
        `This report is already ${selectedTestStatus}. Are you sure you want to update the results? \n\nNote: Changes will be tracked in the audit log.`,
      );
      if (!confirmUpdate) return false;
    }

    setSaving(true);
    setSaveError(null);
    try {
      let submittedBy: string | undefined;
      try {
        const raw = localStorage.getItem("lab.session");
        const session = raw ? JSON.parse(raw) : null;
        submittedBy =
          String(
            session?.username || session?.user?.username || session?.name || "",
          ).trim() || undefined;
      } catch {}
      const testName = selectedTestId
        ? testsMap[selectedTestId]?.name || ""
        : "";
      const rowsToSave = rows.map((r) => ({
        ...r,
        flag: r.flag?.startsWith("critical") ? r.flag : autoFlagForRow(r),
      }));
      let savedId: string | null = null;

      const isApproving = opts?.approve === true;
      const finalTestStatus = isApproving ? "approved" : "result_entered";

      if (existingResultId) {
        const r: any = await labApi.updateResult(existingResultId, {
          rows: rowsToSave,
          interpretation: interpretation.trim() || undefined,
          testId: selectedTestId || undefined,
          testName: testName || undefined,
          strict: opts?.strict === true,
          reportStatus: isApproving ? "approved" : undefined,
        });
        savedId = String(r?._id || existingResultId);
        await labApi.updateOrderTrack(selected.id, {
          testId: selectedTestId || undefined,
          orderTestId: selectedOrderTestId || undefined,
          referringConsultant: (referring.trim() || undefined) as any,
        });
      } else {
        const r: any = await labApi.createResult({
          orderId: selected.id,
          orderTestId: selectedOrderTestId || undefined,
          testId: selectedTestId || undefined,
          testName: testName || undefined,
          rows: rowsToSave,
          interpretation: interpretation.trim() || undefined,
          submittedBy,
          strict: opts?.strict === true,
        });
        savedId = String(r?._id || "");
        const rep = new Date().toTimeString().slice(0, 5);
        await labApi.updateOrderTrack(selected.id, {
          testId: selectedTestId || undefined,
          orderTestId: selectedOrderTestId || undefined,
          status: "result_entered",
          reportingTime: rep,
          referringConsultant: (referring.trim() || undefined) as any,
        });
        if (isApproving && savedId) {
          await labApi.updateResult(savedId, { reportStatus: "approved" });
        }
      }

      // Fetch any open critical events for this result and auto-open modal
      if (savedId) {
        try {
          const res: any = await api(
            `/lab/critical-events?resultId=${savedId}&status=open`,
          );
          const events = (res?.items || []).filter((e: any) => !e.resolvedAt);
          if (events.length) {
            setExistingResultId(savedId);
            setPendingCriticalEvents(events);
            return true;
          }
        } catch {}
      }

      setTick((t) => t + 1);
      setToast({
        type: "success",
        message: `Results ${existingResultId ? "updated" : "saved"} ${isApproving ? "and approved " : ""}successfully for ${testName || "test"}!`,
      });

      // Update selected testStatuses in UI state so sidebar status badge updates immediately
      setSelected((prev) => {
        if (!prev) return null;
        const updatedStatuses = (prev.testStatuses || []).map((ts) => {
          const isMatch =
            ts.testId &&
            selectedTestId &&
            String(ts.testId) === String(selectedTestId);
          if (isMatch) {
            return {
              ...ts,
              status: finalTestStatus as
                | "pending"
                | "sample_collected"
                | "in_progress"
                | "result_entered"
                | "approved"
                | "completed"
                | "returned",
            };
          }
          return ts;
        });
        return { ...prev, testStatuses: updatedStatuses };
      });

      if (savedId) {
        setExistingResultId(savedId);
      }

      if (returnTo === "report-approval") {
        navigate("/lab/report-approval");
      }
      return true;
    } catch (e: any) {
      // Parse backend 400 error for TOTAL_PERCENT_MISMATCH
      const msg = String(e?.message || e || "");
      let parsed: any = null;
      try {
        const jsonStart = msg.indexOf("{");
        if (jsonStart >= 0) parsed = JSON.parse(msg.slice(jsonStart));
      } catch {}
      if (
        parsed?.code === "TOTAL_PERCENT_MISMATCH" ||
        /TOTAL_PERCENT_MISMATCH/.test(msg)
      ) {
        setSaveError({
          code: "TOTAL_PERCENT_MISMATCH",
          message:
            parsed?.message ||
            "Differential total is not 100%. Report cannot be submitted — please review entries.",
          validation: parsed?.validation,
        });
      } else {
        setSaveError({ message: msg || "Save failed" });
      }
      console.error(e);
      return false;
    } finally {
      setSaving(false);
    }
  };

  async function loadPreviousResults(o: Order, testId: string) {
    try {
      setPrior([]);
      // Find prior completed orders for this patient (by MRN/phone/name) that include the same test
      const key = o.patient.mrn || o.patient.phone || o.patient.fullName || "";
      const ordRes: any = await labApi.listOrders({
        q: key,
        status: "completed",
        limit: 500,
      });
      const all: Order[] = (ordRes.items || []).map((x: any) => ({
        id: x._id,
        patientId: x.patientId || undefined,
        createdAt: x.createdAt || new Date().toISOString(),
        patient: x.patient || { fullName: "-", phone: "" },
        tests: x.tests || [],
        status: x.status || "received",
        tokenNo: x.tokenNo,
        sampleTime: x.sampleTime,
        reportingTime: x.reportingTime,
        referringConsultant: x.referringConsultant,
        corporateId: x.corporateId,
        corporateName: x.corporateName,
        corporatePreAuthNo: x.corporatePreAuthNo,
        billingType: x.billingType || (x.corporateId ? "corporate" : "cash"),
      }));
      const samePatient = all.filter((or) => {
        const a = o.patient || {};
        const b = or.patient || {};
        if (a.mrn && b.mrn) return String(a.mrn) === String(b.mrn);
        if (a.phone && b.phone) return String(a.phone) === String(b.phone);
        return (
          String(a.fullName || "")
            .trim()
            .toLowerCase() ===
          String(b.fullName || "")
            .trim()
            .toLowerCase()
        );
      });
      const sameTest = samePatient.filter(
        (or) =>
          or.id !== o.id &&
          Array.isArray(or.tests) &&
          or.tests.some((t: any) => {
            const tid =
              typeof t === "object" && t?.testId ? t.testId : String(t);
            return tid === testId;
          }),
      );
      sameTest.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      );
      const top = sameTest.slice(0, 5);
      const resPairs = await Promise.all(
        top.map(async (ord) => {
          try {
            const r = (await labApi.listResults({
              orderId: ord.id,
              limit: 1,
            })) as any;
            const rec =
              Array.isArray(r.items) && r.items.length ? r.items[0] : null;
            return [ord, rec] as const;
          } catch {
            return [ord, null] as const;
          }
        }),
      );
      const items: Array<{
        order: Order;
        result: {
          id: string;
          orderId: string;
          rows: any[];
          interpretation?: string;
          createdAt: string;
        };
      }> = [];
      for (const [ord, rec] of resPairs) {
        if (rec) {
          items.push({
            order: ord,
            result: {
              id: String(rec._id || rec.id),
              orderId: String(rec.orderId || ord.id),
              rows: rec.rows || [],
              interpretation: rec.interpretation,
              createdAt: String(rec.createdAt || ord.createdAt),
            },
          });
        }
      }
      items.sort(
        (a, b) =>
          new Date(b.result.createdAt || 0).getTime() -
          new Date(a.result.createdAt || 0).getTime(),
      );
      setPrior(items);
      // Prefill prev values in the grid from the most recent previous result if available
      const latest = items[0];
      if (latest) {
        const map: Record<string, string> = {};
        for (const r of latest.result.rows || []) {
          const keyName = String(r.test || "")
            .trim()
            .toLowerCase();
          if (keyName) map[keyName] = String(r.value || "");
        }
        setRows((prev) =>
          prev.map((row) => {
            const k = String(row.test || "")
              .trim()
              .toLowerCase();
            return { ...row, prevValue: map[k] ?? row.prevValue };
          }),
        );
      }
    } catch (e) {
      console.error("Failed to load previous results", e);
      setPrior([]);
    }
  }

  // Keyboard navigation refs (must be before conditional returns — Rules of Hooks)
  const valueInputRefs = useRef<
    (HTMLInputElement | HTMLSelectElement | null)[]
  >([]);
  const [focusedRow, setFocusedRow] = useState<number>(-1);

  const focusRow = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(idx, rows.length - 1));
      setFocusedRow(clamped);
      requestAnimationFrame(() => {
        valueInputRefs.current[clamped]?.focus();
      });
    },
    [rows.length],
  );

  const handleValueKeyDown = useCallback(
    (e: React.KeyboardEvent, rowIdx: number) => {
      if (e.key === "ArrowDown" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        focusRow(rowIdx + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        focusRow(rowIdx - 1);
      }
    },
    [focusRow],
  );

  // Deep link edit: /lab/results?orderId=<id>&token=<lab#>
  useEffect(() => {
    const orderId = searchParams.get("orderId");
    const token = searchParams.get("token") || undefined;
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      try {
        // Load order - try token search first for quicker lookup
        let ord: any = null;
        if (token) {
          const o1 = await labApi.listOrders({ q: token, limit: 500 });
          ord =
            (o1.items || []).find(
              (x: any) => String(x._id) === String(orderId),
            ) || null;
        }
        if (!ord) {
          const o2 = await labApi.listOrders({ limit: 500 });
          ord =
            (o2.items || []).find(
              (x: any) => String(x._id) === String(orderId),
            ) || null;
        }
        if (cancelled || !ord) return;

        const o: Order = {
          id: ord._id,
          patientId: ord.patientId || undefined,
          createdAt: ord.createdAt || new Date().toISOString(),
          patient: ord.patient || { fullName: "-", phone: "" },
          tests: ord.tests || [],
          status: ord.status || "received",
          tokenNo: ord.tokenNo,
          barcode: ord.barcode,
          sampleTime: ord.sampleTime,
          reportingTime: ord.reportingTime,
          returnedTests: Array.isArray(ord.returnedTests)
            ? ord.returnedTests
            : [],
          referringConsultant: ord.referringConsultant,
          corporateId: ord.corporateId,
          corporateName: ord.corporateName,
          corporatePreAuthNo: ord.corporatePreAuthNo,
          billingType:
            ord.billingType || (ord.corporateId ? "corporate" : "cash"),
        };
        setSelected(o);
        const firstTest = o.tests?.[0];
        const tid = firstTest
          ? typeof firstTest === "object" && firstTest?.testId
            ? firstTest.testId
            : String(firstTest)
          : null;
        setSelectedTestId(tid);

        // Load existing result for this specific test
        const res = await labApi.listResults({ orderId, limit: 100 });
        const rec =
          (res.items || []).find(
            (r: any) => r.testId && tid && String(r.testId) === String(tid),
          ) || (res.items && res.items.length === 1 ? res.items[0] : null);

        if (rec) {
          const recRows = (rec.rows || []).map((r: any) => ({
            id: r.id || genId(),
            test: r.test,
            normal: r.normal,
            unit: r.unit,
            prevValue: r.prevValue,
            value: r.value,
            flag: r.flag,
            comment: r.comment,
            formula: r.formula,
            dependencies: r.dependencies,
            isCalculated: !!r.formula,
            lockedMeta: true,
            kind: r.kind || 'quantitative',
          }));
          setRows(calculateDerived(recRows, o.patient));
          setInterpretation(rec.interpretation || "");
          setExistingResultId(String(rec._id || rec.id));
        } else {
          setRows([]);
          setInterpretation("");
          setExistingResultId(null);
        }
        setReferring(o.referringConsultant || "");
        setTrack((prev) => ({
          ...prev,
          [o.id]: {
            status: o.status,
            tokenNo: o.tokenNo || genToken(o.createdAt, o.id),
            sampleTime: o.sampleTime,
            reportingTime: o.reportingTime,
          },
        }));
        if (tid) {
          try {
            await loadPreviousResults(o, tid);
          } catch {}
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredItems = items.filter(
    (o) => !selectedCompany || o.corporateId === selectedCompany,
  );

  // Status counts for MiniDashboard
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      pending: 0,
      sample_collected: 0,
      in_progress: 0,
      result_entered: 0,
      approved: 0,
      returned: 0,
    };
    for (const o of filteredItems) {
      const tList =
        o.testStatuses && o.testStatuses.length > 0 ? o.testStatuses : o.tests;
      for (const t of tList) {
        let s = "pending";
        if (o.testStatuses && o.testStatuses.length > 0) {
          const tid = typeof t === "object" && t?.testId ? t.testId : String(t);
          const ts = o.testStatuses.find(
            (x: any) => String(x.testId) === String(tid),
          );
          s = ts?.status || "pending";
        }
        counts[s] = (counts[s] || 0) + 1;
      }
    }
    return counts;
  }, [filteredItems]);

  if (!selected) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        {/* Header */}
        <div className="rounded-2xl bg-linear-to-r from-violet-600 via-sky-600 to-emerald-500 p-5 text-white shadow-lg shadow-sky-200/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Result Entry</h2>
              <div className="mt-0.5 text-sm text-sky-100">
                Select a sample to enter test results
              </div>
            </div>
            <div className="text-sm text-sky-100">
              {total} sample{total !== 1 ? "s" : ""} pending
            </div>
          </div>
        </div>

        {/* Mini Dashboard */}
        <MiniDashboard
          cards={[
            {
              label: "Total",
              value: Object.values(statusCounts).reduce((a, b) => a + b, 0),
              icon: ListChecks,
              color: "bg-sky-500",
            },
            {
              label: "Pending",
              value: statusCounts["pending"] || 0,
              icon: Clock,
              color: "bg-amber-500",
            },
            {
              label: "Collected",
              value: statusCounts["sample_collected"] || 0,
              icon: FlaskConical,
              color: "bg-blue-500",
            },
            {
              label: "Approved",
              value: statusCounts["approved"] || 0,
              icon: CheckCircle2,
              color: "bg-emerald-500",
            },
          ]}
        />

        {/* Search & Filters */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by ID, patient, token, CNIC, phone..."
                className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              />
            </div>
            <div className="relative min-w-[170px]">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={selectedCompany}
                onChange={(e) => {
                  setSelectedCompany(e.target.value);
                  setPage(1);
                }}
                className="w-full appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
              >
                <option value="">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={rowsPer}
              onChange={(e) => {
                setRowsPer(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
          {/* Status filter tabs */}
          <div className="mt-3 flex flex-wrap items-center gap-1 text-sm">
            {(
              [
                ["all", "All"],
                ["pending", "Pending"],
                ["sample_collected", "Collected"],
                ["in_progress", "In Progress"],
                ["result_entered", "Result Entered"],
                ["approved", "Approved"],
                ["outsourced", "Outsourced"],
                ["dispatched", "Dispatched"],
                ["completed", "Completed"],
                ["returned", "Returned"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => {
                  setStatusFilter(val as any);
                  setPage(1);
                }}
                className={`rounded-md px-3 py-1.5 border text-xs ${statusFilter === val ? "bg-violet-600 text-white border-violet-600" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b-2 border-slate-200 bg-slate-50">
                <tr className="text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Token</th>
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3">MRN</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Test</th>
                  <th className="px-4 py-3">Billing</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((o, rowIdx) => {
                  const token =
                    track[o.id]?.tokenNo || genToken(o.createdAt, o.id);
                  const testsToProcess =
                    o.testStatuses && o.testStatuses.length > 0
                      ? o.testStatuses
                      : o.tests;
                  // Filter by status if needed
                  const visibleTests = testsToProcess.filter((t: any) => {
                    if (statusFilter === "all") return true;
                    const tid =
                      typeof t === "object" && t?.testId ? t.testId : String(t);
                    let testStatus = "pending";
                    if (o.testStatuses && o.testStatuses.length > 0) {
                      const ts = o.testStatuses.find(
                        (s: any) => String(s.testId) === String(tid),
                      );
                      testStatus = ts?.status || "pending";
                    }
                    return testStatus === statusFilter;
                  });
                  if (visibleTests.length === 0 && statusFilter !== "all")
                    return null;
                  // Determine overall status for the order
                  const allStatuses: string[] = testsToProcess.map((t: any) => {
                    const tid =
                      typeof t === "object" && t?.testId ? t.testId : String(t);
                    if (o.testStatuses && o.testStatuses.length > 0) {
                      const ts = o.testStatuses.find(
                        (s: any) => String(s.testId) === String(tid),
                      );
                      return ts?.status || "pending";
                    }
                    return "pending";
                  });
                  const overallStatus: string =
                    allStatuses.includes("approved") ||
                    allStatuses.includes("completed")
                      ? "approved"
                      : allStatuses.includes("result_entered")
                        ? "result_entered"
                        : allStatuses.includes("in_progress")
                          ? "in_progress"
                          : allStatuses.includes("sample_collected")
                            ? "sample_collected"
                            : "pending";
                  const firstTest = testsToProcess[0];
                  const firstTid = firstTest
                    ? typeof firstTest === "object" && firstTest?.testId
                      ? firstTest.testId
                      : String(firstTest)
                    : null;
                  const firstOtid =
                    firstTest &&
                    typeof firstTest === "object" &&
                    (firstTest as any)?.orderTestId
                      ? (firstTest as any).orderTestId
                      : null;
                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-500">
                        {start + rowIdx}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {formatDateTime(o.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {o.patient.fullName}
                        </div>
                        {o.patient.phone && (
                          <div className="text-xs text-slate-500">
                            {o.patient.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-700">
                        {token}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700">
                          <Barcode className="h-3 w-3 text-slate-400" />
                          {o.barcode || genBarcode(o)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {o.patient.mrn || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            o.sampleType === "urgent"
                              ? "bg-rose-100 text-rose-700"
                              : o.sampleType === "stat"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {o.sampleType || "normal"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(statusFilter === "all"
                            ? testsToProcess
                            : visibleTests
                          ).map((t: any, idx: number) => {
                            const tid =
                              typeof t === "object" && t?.testId
                                ? t.testId
                                : String(t);
                            const tname =
                              typeof t === "object" && t?.testName
                                ? t.testName
                                : testsMap[tid]?.name || "—";
                            let testStatus = "pending";
                            if (o.testStatuses && o.testStatuses.length > 0) {
                              const ts = o.testStatuses.find(
                                (s: any) => String(s.testId) === String(tid),
                              );
                              testStatus = ts?.status || "pending";
                            }
                            return (
                              <button
                                key={`${tid}-${idx}`}
                                onClick={() =>
                                  onSelect(
                                    o,
                                    String(tid),
                                    typeof t === "object" &&
                                      (t as any)?.orderTestId
                                      ? (t as any).orderTestId
                                      : null,
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors hover:opacity-80"
                                style={{
                                  background:
                                    testStatus === "approved" ||
                                    testStatus === "completed"
                                      ? "#ECFDF5"
                                      : testStatus === "result_entered"
                                        ? "#FFF7ED"
                                        : testStatus === "sample_collected"
                                          ? "#EFF6FF"
                                          : testStatus === "in_progress"
                                            ? "#FFFBEB"
                                            : "#F8FAFC",
                                  color:
                                    testStatus === "approved" ||
                                    testStatus === "completed"
                                      ? "#065F46"
                                      : testStatus === "result_entered"
                                        ? "#C2410C"
                                        : testStatus === "sample_collected"
                                          ? "#1D4ED8"
                                          : testStatus === "in_progress"
                                            ? "#B45309"
                                            : "#475569",
                                }}
                              >
                                <FlaskConical className="h-3 w-3" />
                                {tname}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {o.billingType === "corporate" ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200"
                            title={o.corporateName || "Corporate"}
                          >
                            <Building2 className="h-3 w-3" />
                            {o.corporateName || "Corporate"}
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                            Cash
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
                            overallStatus === "approved" ||
                            overallStatus === "completed"
                              ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                              : overallStatus === "sample_collected"
                                ? "bg-blue-100 text-blue-700 ring-blue-200"
                                : overallStatus === "in_progress"
                                  ? "bg-amber-100 text-amber-700 ring-amber-200"
                                  : overallStatus === "result_entered"
                                    ? "bg-orange-100 text-orange-700 ring-orange-200"
                                    : "bg-slate-100 text-slate-600 ring-slate-200"
                          }`}
                        >
                          {overallStatus === "sample_collected" && (
                            <Clock className="h-3 w-3" />
                          )}
                          {overallStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {firstTid && (
                            <button
                              onClick={() =>
                                onSelect(o, String(firstTid), firstOtid)
                              }
                              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-colors ${
                                overallStatus === "result_entered" ||
                                overallStatus === "approved" ||
                                overallStatus === "completed"
                                  ? "bg-emerald-600 shadow-emerald-200 hover:bg-emerald-700"
                                  : "bg-violet-600 shadow-violet-200 hover:bg-violet-700"
                              }`}
                            >
                              {overallStatus === "result_entered" ||
                              overallStatus === "approved" ||
                              overallStatus === "completed" ? (
                                <>
                                  <Eye className="h-3.5 w-3.5" /> Check Results
                                </>
                              ) : (
                                <>
                                  <FileCheck className="h-3.5 w-3.5" /> Enter
                                </>
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setTrackTokenNo(token);
                              setTrackOpen(true);
                            }}
                            title="Track"
                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
                          >
                            <Clock className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredItems.length === 0 && (
              <div className="px-4 py-12 text-center text-slate-400">
                <FlaskConical className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-2 text-sm">No samples found</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
            <div className="text-xs">
              {total === 0 ? "0" : `${start}–${end}`} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={curPage <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="h-3 w-3" /> Prev
              </button>
              <span className="text-xs font-medium">
                {curPage} / {pageCount}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={curPage >= pageCount}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                Next <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        <Lab_TrackDialog
          open={trackOpen}
          onClose={() => setTrackOpen(false)}
          tokenNo={trackTokenNo || undefined}
        />
      </div>
    );
  }

  // Entry Mode UI
  const patient = selected.patient;
  const testsToProcess =
    selected.testStatuses && selected.testStatuses.length > 0
      ? selected.testStatuses
      : selected.tests;
  const tokenNo =
    track[selected.id]?.tokenNo || genToken(selected.createdAt, selected.id);
  const selectedTestStatus = selected.testStatuses?.find(
    (ts) => String(ts.testId) === String(selectedTestId),
  )?.status;
  const isLocked =
    (selectedTestStatus === "approved" || selectedTestStatus === "completed") &&
    !session.isAdmin;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 h-[calc(100vh-64px)] overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (returnTo === "report-approval") {
                navigate("/lab/report-approval");
              } else {
                setSelected(null);
                setSelectedTestId(null);
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <h2 className="text-xl font-bold text-slate-900">Result Entry</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700 ring-1 ring-violet-200">
            <FlaskConical className="h-3 w-3" />{" "}
            {selectedTestId ? testsMap[selectedTestId]?.name || "-" : "-"}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-mono text-slate-600 ring-1 ring-slate-200">
            <Barcode className="h-3 w-3" />{" "}
            {selected.barcode || genBarcode(selected)}
          </span>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left Sidebar: Order Tests */}
        <div className="w-64 shrink-0 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/50 p-3 space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 pb-1">
            Order Tests
          </div>
          {testsToProcess.map((t: any, idx: number) => {
            const tid =
              typeof t === "object" && t?.testId ? t.testId : String(t);
            const tname =
              typeof t === "object" && t?.testName
                ? t.testName
                : testsMap[tid]?.name || "—";
            const otid =
              typeof t === "object" && (t as any).orderTestId
                ? (t as any).orderTestId
                : null;
            let testStatus = "pending";
            if (selected.testStatuses && selected.testStatuses.length > 0) {
              const ts = selected.testStatuses.find(
                (s: any) => String(s.testId) === String(tid),
              );
              testStatus = ts?.status || "pending";
            }
            const isActive =
              String(tid) === String(selectedTestId) &&
              (otid ? String(otid) === String(selectedOrderTestId) : true);

            return (
              <button
                key={`${tid}-${idx}`}
                onClick={() => onSelect(selected, String(tid), otid)}
                className={`w-full flex flex-col gap-1 rounded-xl p-3 text-left transition-all border ${
                  isActive
                    ? "bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-200"
                    : "bg-white border-slate-200 text-slate-700 hover:border-violet-300"
                }`}
              >
                <div className="text-sm font-bold truncate leading-tight">
                  {tname}
                </div>
                <div
                  className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? "text-violet-100" : "text-slate-400"}`}
                >
                  {testStatus.replace("_", " ")}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Content: Entry Form */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {isLocked && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              This result is <strong>{selectedTestStatus}</strong> and locked
              for editing. Only admins can override.
            </div>
          )}

          {/* Patient Card */}
          <div className="rounded-2xl border border-slate-200 bg-linear-to-r from-slate-50 to-white p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-900">
                    {patient.fullName}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                    {patient.age && <span>Age: {patient.age}</span>}
                    {patient.gender && <span>Sex: {patient.gender}</span>}
                    {patient.mrn && <span>MRN: {patient.mrn}</span>}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600 font-medium">
                    {formatDateTime(selected.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600">
                    Ref. Doctor
                  </label>
                  <input
                    value={referring}
                    onChange={(e) => setReferring(e.target.value)}
                    className="w-52 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Keyboard hint */}
          <div className="flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-xs text-violet-700">
            <Activity className="h-3.5 w-3.5 shrink-0" />
            <span>
              <b>↑ ↓</b> navigate rows &nbsp;·&nbsp; <b>Enter</b> move down
              &nbsp;·&nbsp; <b>Tab</b> next field &nbsp;·&nbsp;{" "}
              <b>Shift+Enter</b> new line
            </span>
          </div>

          {/* Parameters Grid */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div className="text-sm font-bold text-slate-800">Parameters</div>
            <div className="text-xs text-slate-500">{rows.length} parameter{rows.length !== 1 ? 's' : ''}</div>
          </div>
          <button onClick={addRow} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add Row
          </button>
        </div>

        {(() => {
              const testDef = selectedTestId ? testsMap[selectedTestId] : null;
              const sectionDefs = testDef?.sections || [];
              // Group rows by sectionKey
              const unsectioned: ResultRow[] = [];
              const sectionGroups: Record<string, ResultRow[]> = {};
              for (const r of rows) {
                const sk = r.sectionKey || "";
                if (!sk) {
                  unsectioned.push(r);
                } else {
                  if (!sectionGroups[sk]) sectionGroups[sk] = [];
                  sectionGroups[sk].push(r);
                }
              }

              const renderRow = (r: ResultRow, i: number) => {
                const computed = r.flag?.startsWith("critical")
                  ? r.flag
                  : autoFlagForRow(r);
                const isCritical = computed?.startsWith("critical");
                const isAbnormal = computed?.startsWith("abnormal");
                const isLow = computed?.endsWith("low");
                const isHigh = computed?.endsWith("high");
                const isFocused = focusedRow === i;
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-slate-100 transition-colors ${isFocused ? "bg-violet-50/50" : ""} ${r.isCalculated ? "bg-violet-50/30" : ""} ${isCritical ? "bg-rose-50/50" : ""} ${isAbnormal ? "bg-amber-50/30" : ""}`}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          value={r.test}
                          readOnly
                          className={`w-full rounded-lg border px-2 py-1.5 text-sm border-transparent bg-slate-50 text-slate-700 font-medium outline-none`}
                        />
                        {r.isCalculated && (
                          <span
                            className="shrink-0 rounded bg-violet-100 px-1 py-0.5 text-[10px] font-bold text-violet-600"
                            title={r.formula}
                          >
                            fx
                          </span>
                        )}
                        {r.kind === "qualitative" && (
                          <span className="shrink-0 rounded bg-sky-100 px-1 py-0.5 text-[10px] font-bold text-sky-600">
                            Q
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={r.normal || ""}
                        readOnly={!!r.lockedMeta}
                        onChange={(e) =>
                          setRows((rows) =>
                            rows.map((x, idx) =>
                              idx === i ? { ...x, normal: e.target.value } : x,
                            ),
                          )
                        }
                        className={`w-full rounded-lg border px-2 py-1.5 text-sm ${r.lockedMeta ? "border-transparent bg-slate-50 text-slate-600 font-mono text-xs" : "border-slate-300 bg-white"} outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200`}
                        placeholder="-"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={r.unit || ""}
                        readOnly={!!r.lockedMeta}
                        onChange={(e) =>
                          setRows((rows) =>
                            rows.map((x, idx) =>
                              idx === i ? { ...x, unit: e.target.value } : x,
                            ),
                          )
                        }
                        className={`w-full rounded-lg border px-2 py-1.5 text-sm ${r.lockedMeta ? "border-transparent bg-slate-50 text-slate-600" : "border-slate-300 bg-white"} outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200`}
                        placeholder="-"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={r.prevValue || ""}
                        onChange={(e) =>
                          setRows((rows) =>
                            rows.map((x, idx) =>
                              idx === i
                                ? { ...x, prevValue: e.target.value }
                                : x,
                            ),
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-3 py-2">
                      {r.isCalculated ? (
                        <input
                          ref={(el) => {
                            valueInputRefs.current[i] = el;
                          }}
                          value={r.value || ""}
                          readOnly
                          className="w-full rounded-lg border border-violet-200 bg-violet-50 px-2 py-1.5 font-mono text-sm text-violet-800"
                          placeholder="Auto"
                          title={`Formula: ${r.formula}`}
                          onKeyDown={(e) => handleValueKeyDown(e, i)}
                          onFocus={() => setFocusedRow(i)}
                        />
                      ) : r.kind === "qualitative" ? (
                        <select
                          ref={(el) => {
                            valueInputRefs.current[i] = el;
                          }}
                          value={r.value || ""}
                          onChange={(e) => updateRowValue(r.id, e.target.value)}
                          onKeyDown={(e) => handleValueKeyDown(e, i)}
                          onFocus={() => setFocusedRow(i)}
                          disabled={isLocked}
                          className="w-full rounded-lg border border-sky-300 bg-sky-50 px-2 py-1.5 text-sm text-sky-900 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-200 disabled:opacity-60"
                        >
                          <option value="">—</option>
                          {(r.qualitativeOptions?.length
                            ? r.qualitativeOptions
                            : [
                                "Positive",
                                "Negative",
                                "Reactive",
                                "Non-reactive",
                              ]
                          ).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          ref={(el) => {
                            valueInputRefs.current[i] = el;
                          }}
                          value={r.value || ""}
                          onChange={(e) => updateRowValue(r.id, e.target.value)}
                          onKeyDown={(e) => handleValueKeyDown(e, i)}
                          onFocus={() => setFocusedRow(i)}
                          disabled={isLocked}
                          className={`w-full rounded-lg border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-violet-200 disabled:opacity-60 ${
                            computed === "critical_low"
                              ? "border-rose-400 bg-rose-50 font-bold text-rose-700 focus:border-rose-500"
                              : computed === "critical_high"
                                ? "border-rose-400 bg-rose-50 font-bold text-rose-700 focus:border-rose-500"
                                : computed === "abnormal_low"
                                  ? "border-amber-300 bg-amber-50 font-semibold text-amber-800 focus:border-amber-500"
                                  : computed === "abnormal_high"
                                    ? "border-amber-300 bg-amber-50 font-semibold text-amber-800 focus:border-amber-500"
                                    : "border-slate-300 bg-white focus:border-violet-500"
                          }`}
                          placeholder="Enter"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div
                        className={`w-full rounded-lg border px-2 py-1.5 text-[11px] font-bold text-center ${
                          isCritical && isLow
                            ? "border-rose-300 bg-rose-100 text-rose-700"
                            : isCritical && isHigh
                              ? "border-rose-300 bg-rose-100 text-rose-700"
                              : isCritical
                                ? "border-rose-300 bg-rose-100 text-rose-700"
                                : isAbnormal && isLow
                                  ? "border-amber-300 bg-amber-100 text-amber-700"
                                  : isAbnormal && isHigh
                                    ? "border-amber-300 bg-amber-100 text-amber-700"
                                    : isAbnormal
                                      ? "border-amber-300 bg-amber-100 text-amber-700"
                                      : computed === "normal"
                                        ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                                        : "border-slate-200 bg-slate-50 text-slate-400"
                        }`}
                      >
                        {computed === "critical_low"
                          ? "Critically Low"
                          : computed === "critical_high"
                            ? "Critically High"
                            : computed === "abnormal_low"
                              ? "Abnormal Low"
                              : computed === "abnormal_high"
                                ? "Abnormal High"
                                : computed === "normal"
                                  ? "Normal"
                                  : computed || "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={r.comment || ""}
                        onChange={(e) =>
                          setRows((rows) =>
                            rows.map((x, idx) =>
                              idx === i ? { ...x, comment: e.target.value } : x,
                            ),
                          )
                        }
                        disabled={isLocked}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200 disabled:opacity-60"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => removeRow(r.id)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Remove row"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              };

              const renderTable = (
                sectionRows: ResultRow[],
                showHeader = true,
              ) => (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-sm">
                    {showHeader && (
                      <thead className="border-b-2 border-slate-200 bg-slate-50">
                        <tr className="text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                          <th className="px-3 py-2.5">Test</th>
                          <th className="px-3 py-2.5">Normal</th>
                          <th className="px-3 py-2.5">Unit</th>
                          <th className="px-3 py-2.5">Previous</th>
                          <th className="px-3 py-2.5">Result</th>
                          <th className="px-3 py-2.5">Flag</th>
                          <th className="px-3 py-2.5">Comment</th>
                          <th className="px-3 py-2.5 w-10"></th>
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {sectionRows.length === 0 && (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-3 py-6 text-center text-sm text-slate-400"
                          >
                            No parameters in this section.
                          </td>
                        </tr>
                      )}
                      {sectionRows.map((r) => {
                        const globalIdx = rows.indexOf(r);
                        return renderRow(r, globalIdx);
                      })}
                    </tbody>
                  </table>
                </div>
              );

              // Auto-interpretation preview
              const autoInterp = rows.reduce<string[]>((acc, r) => {
                if (!r.interpretationRules?.length || !r.value) return acc;
                const num = Number(r.value);
                if (Number.isNaN(num)) return acc;
                for (const rule of r.interpretationRules) {
                  const expr = rule.expression
                    .trim()
                    .toLowerCase()
                    .replace(/^value\s*/, "");
                  let match = false;
                  const range = expr.match(
                    /^(-?\d+(?:\.\d+)?)\s*(?:\.\.|-)\s*(-?\d+(?:\.\d+)?)$/,
                  );
                  if (range) {
                    const lo = Math.min(+range[1], +range[2]);
                    const hi = Math.max(+range[1], +range[2]);
                    match = num >= lo && num <= hi;
                  }
                  const cmp = expr.match(
                    /^(>=|<=|>|<|==|=|!=)\s*(-?\d+(?:\.\d+)?)$/,
                  );
                  if (cmp) {
                    const n = +cmp[2];
                    const op = cmp[1];
                    match =
                      op === ">="
                        ? num >= n
                        : op === "<="
                          ? num <= n
                          : op === ">"
                            ? num > n
                            : op === "<"
                              ? num < n
                              : op === "=" || op === "=="
                                ? num === n
                                : op === "!="
                                  ? num !== n
                                  : false;
                  }
                  if (match) {
                    acc.push(
                      `${r.test}: ${rule.label || rule.text || rule.expression}`,
                    );
                    break;
                  }
                }
                return acc;
              }, []);

              return (
                <>
                  {/* Sectioned rendering */}
                  {sectionDefs.length > 0 ? (
                    <>
                      {unsectioned.length > 0 && (
                        <div className="mb-2">{renderTable(unsectioned)}</div>
                      )}
                      {sectionDefs.map((sec) => {
                        const secRows = sectionGroups[sec.key] || [];
                        if (secRows.length === 0) return null;
                        return (
                          <div key={sec.key} className="mb-2">
                            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/60 px-4 py-2">
                              <ChevronDown className="h-3 w-3 text-slate-400" />
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                {sec.title}
                              </span>
                            </div>
                            {renderTable(secRows, true)}
                          </div>
                        );
                      })}
                      {Object.entries(sectionGroups)
                        .filter(([k]) => !sectionDefs.some((s) => s.key === k))
                        .map(([k, secRows]) => (
                          <div key={k} className="mb-2">
                            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/60 px-4 py-2">
                              <ChevronDown className="h-3 w-3 text-slate-400" />
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                {k}
                              </span>
                            </div>
                            {renderTable(secRows, false)}
                          </div>
                        ))}
                    </>
                  ) : (
                    renderTable(rows)
                  )}

                  {/* Auto-interpretation preview */}
                  {autoInterp.length > 0 && (
                    <div className="mx-4 mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
                      <div className="text-xs font-bold uppercase text-emerald-700">
                        Auto-Interpretation
                      </div>
                      <ul className="mt-1 list-disc pl-5 text-slate-700">
                        {autoInterp.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Interpretation */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="text-sm font-bold text-slate-800">
                Interpretation
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ChatGPTHandoffButton
                  testName={
                    selectedTestId ? testsMap[selectedTestId]?.name || "" : ""
                  }
                  patient={{
                    fullName: patient.fullName,
                    age: patient.age,
                    gender: patient.gender,
                    mrn: patient.mrn,
                  }}
                  rows={rows.map((r) => ({
                    test: r.test,
                    value: r.value,
                    unit: r.unit,
                    normal: r.normal,
                    flag: r.flag,
                  }))}
                  interpretation={interpretation}
                />
                <button
                  type="button"
                  onClick={() => setShowHistory(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Clock className="h-3 w-3" /> History
                </button>
                {existingResultId && (
                  <button
                    type="button"
                    onClick={() => setShowRepeat(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                  >
                    <AlertTriangle className="h-3 w-3" /> Repeat
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={interpretation}
              onChange={(e) => setInterpretation(e.target.value)}
              disabled={isLocked}
              className="h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 resize-none disabled:opacity-60"
              placeholder="Clinical interpretation..."
            />
          </div>

          {showRepeat && existingResultId && (
            <RepeatSampleModal
              resultId={existingResultId}
              testName={
                selectedTestId ? testsMap[selectedTestId]?.name || "" : ""
              }
              onClose={() => setShowRepeat(false)}
              onDone={() => {
                setExistingResultId(null);
                setRows(
                  rows.map((r) => ({
                    ...r,
                    value: "",
                    flag: undefined as any,
                  })),
                );
                setInterpretation("");
              }}
            />
          )}
          {showHistory && selected?.patient && (
            <TestHistoryModal
              patientId={selected.patientId || ""}
              testId={selectedTestId || undefined}
              testName={
                selectedTestId ? testsMap[selectedTestId]?.name || "" : ""
              }
              onClose={() => setShowHistory(false)}
            />
          )}

          {/* Previous Results */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-bold text-slate-800">
                Previous Results
                {selectedTestId
                  ? ` — ${testsMap[selectedTestId]?.name || ""}`
                  : ""}
              </div>
              <div className="text-xs text-slate-500">
                {prior.length
                  ? `${prior.length} record${prior.length > 1 ? "s" : ""}`
                  : "No previous results"}
              </div>
            </div>
            {prior.length > 0 && (
              <div className="space-y-3">
                {prior.map((p) => {
                  const token =
                    p.order.tokenNo || genToken(p.order.createdAt, p.order.id);
                  return (
                    <div
                      key={p.result.id}
                      className="overflow-hidden rounded-lg border border-slate-200"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2 text-xs">
                        <div className="flex items-center gap-2 text-slate-600">
                          <CalendarDays className="h-3 w-3 text-slate-400" />
                          {new Date(p.result.createdAt).toLocaleString()}
                          <span className="text-slate-400">·</span>
                          <span className="font-mono">{token}</span>
                        </div>
                        <button
                          onClick={() => {
                            previewLabReportPdf({
                              tokenNo: token,
                              createdAt: p.order.createdAt,
                              sampleTime: p.order.sampleTime,
                              reportingTime: p.order.reportingTime,
                              approvedAt:
                                (p.result as any).approvedAt || undefined,
                              approvedBy:
                                (p.result as any).approvedBy || undefined,
                              patient: {
                                fullName: p.order.patient.fullName,
                                phone: p.order.patient.phone,
                                mrn: p.order.patient.mrn,
                                age: p.order.patient.age,
                                gender: p.order.patient.gender,
                                address: p.order.patient.address,
                              },
                              rows: buildPrintRows(
                                p.result.rows || [],
                                testsMap[
                                  typeof p.order.tests?.[0] === "object"
                                    ? (p.order.tests[0] as any).testId
                                    : String(p.order.tests?.[0] || "")
                                ],
                              ),
                              interpretation: p.result.interpretation,
                              referringConsultant: p.order.referringConsultant,
                              profileLabel: (() => {
                                const first = p.order.tests?.[0];
                                if (!first) return "";
                                const firstId =
                                  typeof first === "object" && first?.testId
                                    ? first.testId
                                    : String(first);
                                const firstName =
                                  typeof first === "object" && first?.testName
                                    ? first.testName
                                    : testsMap[firstId]?.name || "";
                                return firstName;
                              })(),
                            }).then(() => {
                              const tokenId =
                                (p.order as any).tokenId ||
                                (p.result as any).tokenId ||
                                token;
                              labApi.markReportPrinted(tokenId).catch(() => {});
                            });
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <Printer className="h-3 w-3" /> Reprint
                        </button>
                      </div>
                      <div className="overflow-x-auto p-3">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 text-slate-500">
                            <tr>
                              <th className="px-2 py-1 text-left font-semibold">
                                Test
                              </th>
                              <th className="px-2 py-1 text-left font-semibold">
                                Value
                              </th>
                              <th className="px-2 py-1 text-left font-semibold">
                                Unit
                              </th>
                              <th className="px-2 py-1 text-left font-semibold">
                                Normal
                              </th>
                              <th className="px-2 py-1 text-left font-semibold">
                                Flag
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(p.result.rows || []).map((r: any, i: number) => (
                              <tr key={i} className="border-b border-slate-100">
                                <td className="px-2 py-1 font-medium text-slate-700">
                                  {r.test}
                                </td>
                                <td className="px-2 py-1">{r.value || "-"}</td>
                                <td className="px-2 py-1 text-slate-500">
                                  {r.unit || "-"}
                                </td>
                                <td className="px-2 py-1 text-slate-500">
                                  {r.normal || "-"}
                                </td>
                                <td className="px-2 py-1">
                                  {r.flag ? (
                                    <span
                                      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                        String(r.flag).startsWith("critical")
                                          ? "bg-rose-100 text-rose-700"
                                          : String(r.flag).startsWith(
                                                "abnormal",
                                              )
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-emerald-100 text-emerald-700"
                                      }`}
                                    >
                                      {r.flag === "critical_low"
                                        ? "Critically Low"
                                        : r.flag === "critical_high"
                                          ? "Critically High"
                                          : r.flag === "abnormal_low"
                                            ? "Abnormal Low"
                                            : r.flag === "abnormal_high"
                                              ? "Abnormal High"
                                              : r.flag === "normal"
                                                ? "Normal"
                                                : String(r.flag)}
                                    </span>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {p.result.interpretation && (
                          <div className="mt-2 whitespace-pre-wrap text-xs text-slate-600">
                            <span className="font-semibold text-slate-700">
                              Interpretation:
                            </span>{" "}
                            {p.result.interpretation}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="sticky bottom-0 z-10 -mx-4 -mb-4 border-t border-slate-200 bg-white/95 backdrop-blur px-4 py-3 md:-mx-6 md:-mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (returnTo === "report-approval") {
                      navigate("/lab/report-approval");
                    } else {
                      setSelected(null);
                      setSelectedTestId(null);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>
                <button
                  onClick={() => {
                    previewLabReportPdf({
                      tokenNo,
                      createdAt: selected.createdAt,
                      sampleTime: track[selected.id]?.sampleTime,
                      reportingTime: track[selected.id]?.reportingTime,
                      approvedAt: (selected as any).approvedAt || undefined,
                      approvedBy: (selected as any).approvedBy || undefined,
                      patient: {
                        fullName: patient.fullName,
                        phone: patient.phone,
                        mrn: patient.mrn,
                        age: patient.age,
                        gender: patient.gender,
                        address: patient.address,
                      },
                      rows: buildPrintRows(
                        rows,
                        selectedTestId ? testsMap[selectedTestId] : null,
                      ),
                      interpretation,
                      referringConsultant: referring.trim() || undefined,
                      profileLabel: selectedTestId
                        ? testsMap[selectedTestId]?.name || ""
                        : undefined,
                    }).then(() => {
                      const tokenId =
                        selected.id || (selected as any)._id || tokenNo;
                      labApi.markReportPrinted(tokenId).catch(() => {});
                    });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Printer className="h-4 w-4" /> Print
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => save()}
                  disabled={isLocked || saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save
                    className={`h-4 w-4 ${saving ? "animate-pulse" : ""}`}
                  />{" "}
                  {saving ? "Saving..." : "Save Draft"}
                </button>
                <button
                  onClick={() => save({ strict: true })}
                  disabled={isLocked || saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-200 hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send
                    className={`h-4 w-4 ${saving ? "animate-pulse" : ""}`}
                  />{" "}
                  {saving ? "Submitting..." : "Submit"}
                </button>
                <button
                  onClick={() => save({ strict: true, approve: true })}
                  disabled={isLocked || saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-200 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2
                    className={`h-4 w-4 ${saving ? "animate-pulse" : ""}`}
                  />{" "}
                  {saving ? "Approving..." : "Submit & Approve"}
                </button>
              </div>
            </div>
          </div>

          {saveError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm">
              <div className="flex items-center gap-2 font-bold text-rose-700">
                <AlertTriangle className="h-4 w-4" />
                {saveError.code === "TOTAL_PERCENT_MISMATCH"
                  ? "Differential total ≠ 100%"
                  : "Save failed"}
              </div>
              <div className="mt-1 text-rose-600">{saveError.message}</div>
              {saveError.validation?.groups && (
                <ul className="mt-2 list-disc pl-5 text-xs text-rose-600">
                  {Object.entries<any>(saveError.validation.groups).map(
                    ([k, v]) => (
                      <li key={k}>
                        {k}: total {v.total}% (need 100 ± 0.5)
                      </li>
                    ),
                  )}
                </ul>
              )}
            </div>
          )}

          {pendingCriticalEvents.length > 0 && (
            <CriticalResultDetailModal
              events={pendingCriticalEvents}
              onClose={() => setPendingCriticalEvents([])}
              onDone={() => {
                setPendingCriticalEvents([]);
                setTick((t) => t + 1);
                if (returnTo === "report-approval")
                  navigate("/lab/report-approval");
              }}
            />
          )}

          <Lab_TrackDialog
            open={trackOpen}
            onClose={() => setTrackOpen(false)}
            tokenNo={trackTokenNo || undefined}
          />
          <Toast toast={toast} onClose={() => setToast(null)} />
        </div>
      </div>
    </div>
  );
}
