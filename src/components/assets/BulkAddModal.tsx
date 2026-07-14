import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { useData } from "@/contexts/data";
import { toast } from "sonner";
import { CATEGORIES as FALLBACK_CATEGORIES, MANUFACTURERS as FALLBACK_MANUFACTURERS, LOCATIONS as FALLBACK_LOCATIONS } from "@/data/mock";

interface BulkAssetRow {
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  serial: string;
  purchaseDate: string;
  warrantyExpiry: string;
  location: string;
  status: string;
  assignedTo: string;
  remarks: string;
}

function emptyRow(): BulkAssetRow {
  return {
    name: "",
    category: "",
    manufacturer: "",
    model: "",
    serial: "",
    purchaseDate: "",
    warrantyExpiry: "",
    location: "",
    status: "Available",
    assignedTo: "",
    remarks: "",
  };
}

interface BulkAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: string[];
  manufacturers: string[];
  locations: string[];
}

const STATUS_OPTIONS = ["Available", "Assigned", "Maintenance", "Retired"];

export function BulkAddModal({ open, onOpenChange, categories, manufacturers, locations }: BulkAddModalProps) {
  const { employees, addBulkAssets } = useData();
  const [rows, setRows] = useState<BulkAssetRow[]>(() =>
    Array.from({ length: 5 }, () => emptyRow())
  );
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const safeCategories = categories.length > 0 ? categories : FALLBACK_CATEGORIES;
  const safeManufacturers = manufacturers.length > 0 ? manufacturers : FALLBACK_MANUFACTURERS;
  const safeLocations = locations.length > 0 ? locations : FALLBACK_LOCATIONS;

  console.log("[BulkAddModal] Options:", {
    categories: safeCategories,
    manufacturers: safeManufacturers,
    locations: safeLocations,
    employeesCount: employees.length,
    rowsCount: rows.length,
  });

  const resetState = useCallback(() => {
    setRows(Array.from({ length: 5 }, () => emptyRow()));
    setSaving(false);
    setErrors([]);
  }, []);

  const handleClose = useCallback(() => {
    if (!saving) {
      resetState();
      onOpenChange(false);
    }
  }, [saving, resetState, onOpenChange]);

  const updateRow = (index: number, field: keyof BulkAssetRow, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      console.log("[BulkAddModal] Row updated:", { index, field, value, row: next[index] });
      return next;
    });
    setErrors([]);
  };

  const addRow = () => {
    setRows((prev) => {
      const next = [...prev, emptyRow()];
      console.log("[BulkAddModal] Row added, total:", next.length);
      return next;
    });
  };

  const deleteRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      console.log("[BulkAddModal] Row deleted, remaining:", next.length);
      return next;
    });
    setErrors([]);
  };

  const validate = (): boolean => {
    const errs: string[] = [];
    const nonEmpty = rows.filter((r) => r.name.trim() || r.serial.trim());

    if (nonEmpty.length === 0) {
      errs.push("Please add at least one asset.");
      setErrors(errs);
      return false;
    }

    nonEmpty.forEach((r, i) => {
      if (!r.name.trim()) errs.push(`Row ${i + 1}: Asset Name is required.`);
      if (!r.category) errs.push(`Row ${i + 1}: Category is required.`);
      if (!r.manufacturer) errs.push(`Row ${i + 1}: Manufacturer is required.`);
      if (!r.serial.trim()) errs.push(`Row ${i + 1}: Serial Number is required.`);
    });

    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = rows
        .filter((r) => r.name.trim() || r.serial.trim())
        .map((r) => ({
          name: r.name.trim(),
          category: r.category,
          manufacturer: r.manufacturer,
          model: r.model.trim() || `${r.manufacturer.slice(0, 2).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`,
          serial: r.serial.trim().toUpperCase(),
          purchaseDate: r.purchaseDate || new Date().toISOString().slice(0, 10),
          warrantyExpiry: r.warrantyExpiry || new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().slice(0, 10),
          location: r.location,
          status: r.status as "Assigned" | "Available" | "Maintenance" | "Retired",
          assignedTo: r.assignedTo || null,
          cost: Math.floor(Math.random() * 2500) + 500,
          remarks: r.remarks || "",
        }));

      const created = await addBulkAssets(payload);
      const count = created.length ?? payload.length;
      toast.success(`${count} Asset${count !== 1 ? "s" : ""} Added Successfully`);
      resetState();
      onOpenChange(false);
    } catch {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving && !o) handleClose(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle>Add Multiple Assets</DialogTitle>
        </DialogHeader>

        {errors.length > 0 && (
          <Alert variant="destructive" className="mx-6 mb-2 shrink-0">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc pl-4 text-sm space-y-0.5">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex-1 overflow-y-auto px-6 scrollbar-thin">
          <div className="space-y-4 py-2">
            {rows.map((row, index) => (
              <div key={index} className="border rounded-lg p-4 relative">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Asset #{index + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    disabled={rows.length <= 1}
                    onClick={() => deleteRow(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Asset Name *</Label>
                    <Input
                      className="mt-1 h-9"
                      placeholder="Dell Latitude 5540"
                      value={row.name}
                      onChange={(e) => updateRow(index, "name", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Category *</Label>
                    <Select value={row.category} onValueChange={(v) => updateRow(index, "category", v)}>
                      <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {safeCategories.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Manufacturer *</Label>
                    <Select value={row.manufacturer} onValueChange={(v) => updateRow(index, "manufacturer", v)}>
                      <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {safeManufacturers.map((m) => (
                          <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Model</Label>
                    <Input
                      className="mt-1 h-9"
                      placeholder="Latitude 5540"
                      value={row.model}
                      onChange={(e) => updateRow(index, "model", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Serial Number *</Label>
                    <Input
                      className="mt-1 h-9"
                      placeholder="SN…"
                      value={row.serial}
                      onChange={(e) => updateRow(index, "serial", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Purchase Date</Label>
                    <Input
                      className="mt-1 h-9"
                      type="date"
                      value={row.purchaseDate}
                      onChange={(e) => updateRow(index, "purchaseDate", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Warranty Expiry</Label>
                    <Input
                      className="mt-1 h-9"
                      type="date"
                      value={row.warrantyExpiry}
                      onChange={(e) => updateRow(index, "warrantyExpiry", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Location</Label>
                    <Select value={row.location} onValueChange={(v) => updateRow(index, "location", v)}>
                      <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {safeLocations.map((l) => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={row.status} onValueChange={(v) => updateRow(index, "status", v)}>
                      <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Assigned Employee</Label>
                    <Select value={row.assignedTo} onValueChange={(v) => updateRow(index, "assignedTo", v)}>
                      <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Remarks</Label>
                    <Input
                      className="mt-1 h-9"
                      placeholder="Optional notes"
                      value={row.remarks}
                      onChange={(e) => updateRow(index, "remarks", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t shrink-0 bg-background">
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4 mr-1" />
            Add Row
          </Button>
          <span className="text-xs text-muted-foreground">{rows.length} row{rows.length !== 1 ? "s" : ""}</span>
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
