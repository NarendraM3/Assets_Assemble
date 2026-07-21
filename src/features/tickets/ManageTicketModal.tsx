import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/common/StatusBadge";
import { apiFetch } from "@/services/api";
import { toast } from "sonner";
import type { Ticket } from "@/types/domain";
import { useData } from "@/contexts/data";

const STATUS_OPTIONS = [
  "Open",
  "Accepted",
  "In Progress",
  "Waiting for User",
  "Resolved",
  "Closed",
];

const ESTIMATED_TIME_OPTIONS = [
  "30 Minutes",
  "1 Hour",
  "2 Hours",
  "4 Hours",
  "Today",
  "Tomorrow",
  "2 Days",
  "3 Days",
  "1 Week",
];

interface ManageTicketModalProps {
  open: boolean;
  ticket: Ticket | null;
  onClose: () => void;
  onUpdated: () => void;
}

export function ManageTicketModal({ open, ticket, onClose, onUpdated }: ManageTicketModalProps) {
  const { setTickets } = useData();
  const [selectedStatus, setSelectedStatus] = useState("Open");
  const [selectedEstimate, setSelectedEstimate] = useState("");
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (ticket) {
      setSelectedStatus(ticket.status);
      setSelectedEstimate("");
      setNote("");
    }
  }, [ticket]);

  const handleUpdate = async () => {
    if (!ticket) return;
    console.log("Selected Ticket:", ticket);
    setUpdating(true);
    try {
      const response = await apiFetch<any>(`/tickets/${ticket.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: selectedStatus,
          estimatedTime: selectedEstimate,
          note,
        }),
      });

      console.log("[PATCH Success]", response);

      setTickets((prev: Ticket[]) =>
        prev.map((t: Ticket) =>
          t.id === ticket.id
            ? { ...t, status: selectedStatus as Ticket["status"] }
            : t,
        ),
      );

      toast.success("Ticket updated successfully");
      onClose();
      onUpdated();
    } catch (err: any) {
      toast.error(err.message || "Failed to update ticket");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!updating && !o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ticket Details</DialogTitle>
        </DialogHeader>
        {ticket && (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4 p-3 bg-muted/40 rounded-md">
              <div><span className="text-muted-foreground">Ticket ID:</span> <span className="font-medium">{ticket.id}</span></div>
              <div><span className="text-muted-foreground">Title:</span> <span className="font-medium">{ticket.title}</span></div>
              <div className="col-span-2"><span className="text-muted-foreground">Description:</span> <span className="font-medium">{ticket.description}</span></div>
              <div><span className="text-muted-foreground">Category:</span> <span className="font-medium">{ticket.category}</span></div>
              <div><span className="text-muted-foreground">Priority:</span> <span className="font-medium">{ticket.priority}</span></div>
              <div><span className="text-muted-foreground">Requester:</span> <span className="font-medium">{ticket.createdBy}</span></div>
              <div><span className="text-muted-foreground">Assignee:</span> <span className="font-medium">{ticket.assignee ?? "Unassigned"}</span></div>
              <div><span className="text-muted-foreground">Current Status:</span> <StatusBadge status={ticket.status} /></div>
              <div className="col-span-2"><span className="text-muted-foreground">Estimated Resolution Time:</span> <span className="font-medium">{ticket.EstimatedResolutionTime || "Not Estimated Yet"}</span></div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Estimated Resolution Time</Label>
                <Select value={selectedEstimate} onValueChange={setSelectedEstimate}>
                  <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                  <SelectContent>
                    {ESTIMATED_TIME_OPTIONS.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Enter update for employee..."
                  className="min-h-24"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={updating}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={updating}>
                {updating ? "Updating..." : "Update Ticket"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
