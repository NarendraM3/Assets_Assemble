import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Upload, Save, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth";
import { useData } from "@/contexts/data";
import { fetchAssignedAssets } from "@/services/data";
import { uniqueValues } from "@/lib/live-data";
import type { Asset } from "@/types/domain";

const schema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(120),
  description: z.string().trim().min(15, "Please describe the issue in detail").max(2000),
  category: z.string().min(1, "Select a category"),
  assetId: z.string().optional(),
});
type FormV = z.infer<typeof schema>;

export default function RaiseTicket() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { tickets, createTicket, uploadFiles } = useData();
  const [assignedAssets, setAssignedAssets] = useState<Asset[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const TICKET_CATEGORIES = useMemo(() => uniqueValues(tickets.map(t => t.category)), [tickets]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAssetsLoading(true);
    fetchAssignedAssets().then(assets => {
      if (!cancelled) {
        setAssignedAssets(assets);
        setAssetsLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setAssetsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<FormV>({
    resolver: zodResolver(schema),
    defaultValues: { category: "", assetId: "" },
  });
  const category = watch("category");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const newFiles = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const removeAttachment = (index: number) => {
    if (attachments.length > 0) {
      setAttachments(prev => prev.filter((_, i) => i !== index));
    } else {
      setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  const onSubmit = async (v: FormV) => {
    try {
      const storedRaw = JSON.parse(localStorage.getItem("employee") || "{}");
      const employeeId = storedRaw?.EmployeeId || storedRaw?.display_id || user?.display_id || user?.id || "";
      const department = storedRaw?.department || "";

      console.log("[RaiseTicket] Form watch:", watch());
      console.log("[RaiseTicket] Zod-validated data:", v);
      console.log("[RaiseTicket] employeeId:", employeeId, "department:", department);

      // Zod resolver already validates title (min 5), description (min 15), category (min 1).
      // Only employeeId is truly required here since department can fall back to "Unassigned".
      if (!employeeId) {
        toast.error("Employee information not found. Please try logging in again.");
        return;
      }

      const payload = {
        title: v.title,
        description: v.description,
        priority: "Medium" as const,
        category: v.category,
        department: department || "Unassigned",
        employeeId,
        created_by_id: employeeId,
        assetId: v.assetId || null,
        createdBy: user?.name || "Employee User",
        attachments,
      };

      console.log("[RaiseTicket] Outgoing payload:", JSON.stringify(payload, null, 2));

      const ticket = await createTicket(payload, user?.name || "Employee User");

      console.log("Ticket Response:", ticket);

      const TicketId =
        (ticket as any)?.id ||
        (ticket as any)?.TicketId ||
        (ticket as any)?.ticketId ||
        (ticket as any)?.uuid ||
        (ticket as any)?.ticket?.TicketId ||
        (ticket as any)?.ticket?.ticketId ||
        (ticket as any)?.data?.ticketId ||
        (ticket as any)?.data?.TicketId ||
        (ticket as any)?.data?.ticket?.TicketId ||
        (ticket as any)?.data?.uuid;

      console.log("TicketId:", TicketId);

      if (!TicketId) {
        toast.error("Ticket was created but no ticket ID was returned. Please contact IT Support Team.");
        return;
      }

      if (selectedFiles.length > 0) {
        setUploading(true);
        try {
          const storedRaw = JSON.parse(localStorage.getItem("employee") || "{}");
          const EmployeeId = (user as any)?.EmployeeId || storedRaw?.EmployeeId || user?.display_id || user?.id || "";

          console.log("TicketId:", TicketId);
          console.log("EmployeeId:", EmployeeId);

          if (!TicketId) {
            throw new Error("TicketId is missing");
          }
          if (!EmployeeId) {
            throw new Error("EmployeeId is missing");
          }

          const urls = await uploadFiles(selectedFiles, TicketId, EmployeeId);
          if (urls.length > 0) {
            setAttachments(urls);
          }
        } catch (uploadErr: any) {
          toast.error(uploadErr.message || "File upload failed after ticket creation");
          return;
        } finally {
          setUploading(false);
        }
      }

      console.log("[RaiseTicket] Final attachments state before nav:", attachments);
      console.log("[RaiseTicket] selectedFiles before nav:", selectedFiles);
      toast.success("Ticket submitted - we'll get back to you shortly", {
        description: `Category: ${v.category}`,
      });
      reset();
      setAttachments([]);
      setSelectedFiles([]);
      nav("/my-tickets?refresh=1");
    } catch (err: any) {
      toast.error(err.message || "Failed to create ticket");
    }
  };
  const saveDraft = () => toast.info("Draft saved locally");

  return (
    <>
      <PageHeader title="Raise a Ticket" description="Report an issue and our IT Support Team will respond quickly." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-2 space-y-4">
          <Card className="p-6 space-y-4">
            <div>
              <Label>Title</Label>
              <Input className="mt-1.5" placeholder="e.g. Laptop won't boot after update" {...register("title")} />
              {errors.title && <div className="text-xs text-destructive mt-1">{errors.title.message}</div>}
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={v => setValue("category", v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  {TICKET_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.category && <div className="text-xs text-destructive mt-1">{errors.category.message}</div>}
            </div>
            <div>
              <Label>Related Asset (optional)</Label>
              <Select value={watch("assetId") || ""} onValueChange={v => setValue("assetId", v || "")}>
                <SelectTrigger className="mt-1.5" disabled={assetsLoading}>
                  <SelectValue placeholder={assetsLoading ? "Loading assets..." : "Attach to an asset"} />
                </SelectTrigger>
                <SelectContent>
                  {assetsLoading ? (
                    <SelectItem value="__loading__" disabled className="cursor-default">
                      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading assets...</span>
                    </SelectItem>
                  ) : assignedAssets.length === 0 ? (
                    <SelectItem value="__empty__" disabled className="cursor-default text-muted-foreground">
                      No assigned assets found
                    </SelectItem>
                  ) : (
                    assignedAssets.map(a => (
                      <SelectItem key={a.assetId} value={a.assetId}>{a.assetId} - {a.assetName}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea className="mt-1.5 min-h-32" placeholder="Steps to reproduce, error messages, impact..." {...register("description")} />
              {errors.description && <div className="text-xs text-destructive mt-1">{errors.description.message}</div>}
            </div>
            <div>
              <Label>Attachments</Label>
              <label className={cn(
                "mt-1.5 flex items-center justify-center gap-2 border-2 border-dashed rounded-md p-6 text-sm text-muted-foreground hover:border-primary/40 cursor-pointer transition-colors",
                uploading && "opacity-50 pointer-events-none"
              )}>
                <Upload className="h-4 w-4" />
                <span>{uploading ? "Uploading files..." : "Drop files or click to upload (screenshots, logs)"}</span>
                <input type="file" multiple className="hidden" onChange={handleFileChange} disabled={uploading} />
              </label>

              {(selectedFiles.length > 0 || attachments.length > 0) && (
                <div className="mt-3 space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    {attachments.length > 0 ? `Uploaded Attachments (${attachments.length})` : `Selected Files (${selectedFiles.length})`}
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(attachments.length > 0 ? attachments : selectedFiles).map((item, idx) => {
                      const fileName = typeof item === "string"
                        ? item.substring(item.indexOf("_") + 1)
                        : item.name;
                      return (
                        <div key={idx} className="flex items-center justify-between p-2 rounded-md border bg-muted/40 text-xs">
                          <span className="font-medium truncate max-w-[220px]">{fileName}</span>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => removeAttachment(idx)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </Card>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => reset()}>Reset</Button>
            <Button type="button" variant="outline" onClick={saveDraft}><Save className="h-4 w-4 mr-1" />Save Draft</Button>
            <Button type="submit">Submit Ticket</Button>
          </div>
        </form>
        <div>
          <Card className="p-5">
            <div className="font-semibold text-sm mb-2">Response Times</div>
            <div className="space-y-2 text-sm">
              {[
                { p: "Critical", t: "<= 1 hour", tone: "text-destructive" },
                { p: "High", t: "<= 4 hours", tone: "text-warning" },
                { p: "Medium", t: "<= 1 business day", tone: "text-info" },
                { p: "Low", t: "<= 3 business days", tone: "text-muted-foreground" },
              ].map(x => (
                <div key={x.p} className="flex items-center justify-between border-b last:border-0 py-2">
                  <span className={x.tone + " font-medium"}>{x.p}</span>
                  <span className="text-muted-foreground">{x.t}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5 mt-4">
            <div className="font-semibold text-sm mb-2">Tips</div>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-4">
              <li>Include your asset ID and location.</li>
              <li>Attach screenshots for UI issues.</li>
              <li>Provide error messages verbatim.</li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
