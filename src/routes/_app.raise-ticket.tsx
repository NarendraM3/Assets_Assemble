import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Upload, Save } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TICKET_CATEGORIES, assets } from "@/data/mock";

export const Route = createFileRoute("/_app/raise-ticket")({
  component: RaiseTicket,
});

const schema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(120),
  description: z.string().trim().min(15, "Please describe the issue in detail").max(2000),
  priority: z.enum(["Low","Medium","High","Critical"]),
  category: z.string().min(1, "Select a category"),
  assetId: z.string().optional(),
});
type FormV = z.infer<typeof schema>;

function RaiseTicket() {
  const nav = useNavigate();
  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<FormV>({
    resolver: zodResolver(schema),
    defaultValues: { priority: "Medium", category: "", assetId: "" },
  });
  const priority = watch("priority");
  const category = watch("category");

  const onSubmit = (v: FormV) => {
    toast.success(`Ticket submitted — we'll get back to you shortly`, {
      description: `Priority: ${v.priority} • Category: ${v.category}`,
    });
    reset();
    nav({ to: "/my-tickets" });
  };
  const saveDraft = () => toast.info("Draft saved locally");

  return (
    <>
      <PageHeader title="Raise a Ticket" description="Report an issue and our support team will respond quickly." />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-2 space-y-4">
          <Card className="p-6 space-y-4">
            <div>
              <Label>Title</Label>
              <Input className="mt-1.5" placeholder="e.g. Laptop won't boot after update" {...register("title")}/>
              {errors.title && <div className="text-xs text-destructive mt-1">{errors.title.message}</div>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Priority</Label>
                <Select value={priority} onValueChange={v => setValue("priority", v as FormV["priority"])}>
                  <SelectTrigger className="mt-1.5"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {["Low","Medium","High","Critical"].map(p=><SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={category} onValueChange={v => setValue("category", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select a category"/></SelectTrigger>
                  <SelectContent>
                    {TICKET_CATEGORIES.map(c=><SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.category && <div className="text-xs text-destructive mt-1">{errors.category.message}</div>}
              </div>
            </div>
            <div>
              <Label>Related Asset (optional)</Label>
              <Select value={watch("assetId")} onValueChange={v => setValue("assetId", v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Attach to an asset"/></SelectTrigger>
                <SelectContent>
                  {assets.slice(0, 20).map(a => <SelectItem key={a.id} value={a.id}>{a.id} — {a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea className="mt-1.5 min-h-32" placeholder="Steps to reproduce, error messages, impact…" {...register("description")}/>
              {errors.description && <div className="text-xs text-destructive mt-1">{errors.description.message}</div>}
            </div>
            <div>
              <Label>Attachments</Label>
              <label className="mt-1.5 flex items-center justify-center gap-2 border-2 border-dashed rounded-md p-6 text-sm text-muted-foreground hover:border-primary/40 cursor-pointer transition-colors">
                <Upload className="h-4 w-4"/>
                <span>Drop files or click to upload (screenshots, logs)</span>
                <input type="file" multiple className="hidden"/>
              </label>
            </div>
          </Card>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => reset()}>Reset</Button>
            <Button type="button" variant="outline" onClick={saveDraft}><Save className="h-4 w-4 mr-1"/>Save Draft</Button>
            <Button type="submit">Submit Ticket</Button>
          </div>
        </form>
        <div>
          <Card className="p-5">
            <div className="font-semibold text-sm mb-2">Response Times</div>
            <div className="space-y-2 text-sm">
              {[
                { p: "Critical", t: "≤ 1 hour", tone: "text-destructive" },
                { p: "High", t: "≤ 4 hours", tone: "text-warning" },
                { p: "Medium", t: "≤ 1 business day", tone: "text-info" },
                { p: "Low", t: "≤ 3 business days", tone: "text-muted-foreground" },
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
