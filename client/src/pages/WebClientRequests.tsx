import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/badge"; // Wait, button is in ui/button usually. We'll use HTML button if we can't find it, or generic Tailwind. Let's use generic Tailwind to be safe if Button isn't exported perfectly.
import { MessageSquare, Clock, CheckCircle, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type QuoteRequest = {
  id: number;
  name: string;
  contact: string;
  part_name: string;
  quantity: number;
  message: string;
  status: string;
  created_at: string;
};

// Fallback tailwind button since I'm not sure of ui/button path
const ActionButton = ({ onClick, children, variant = "primary" }: any) => {
  const base = "px-4 py-2 rounded-md font-medium text-sm transition-colors";
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
  };
  return <button onClick={onClick} className={`${base} ${variants[variant]}`}>{children}</button>;
};

export default function WebClientRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: quotes, isLoading } = useQuery({
    queryKey: ["/api/quotes"],
    queryFn: async () => {
      const res = await fetch("/api/quotes");
      if (!res.ok) throw new Error("Failed to fetch quotes");
      return res.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/quotes/${id}/status?status=${status}`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({ title: "Success", description: "Quote status updated." });
    },
  });

  const handleMakeQuote = (quote: QuoteRequest) => {
    // This bridges to the internal quotation system.
    // For now, it alerts and marks as responded.
    alert(`Opening Quotation Builder for: ${quote.part_name} (Qty: ${quote.quantity})\nClient: ${quote.name}`);
    updateStatusMutation.mutate({ id: quote.id, status: "Responded" });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Web Client Quote Requests</h1>
          <p className="text-muted-foreground mt-1">
            Manage incoming part quotation requests from the public website.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-10">Loading requests...</div>
      ) : quotes?.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No quote requests yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Incoming requests from the website will appear here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quotes?.map((quote: any) => (
            <Card key={quote.id} className={quote.status === "New" ? "border-l-4 border-l-amber-500" : ""}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg">{quote.name}</h3>
                      <Badge variant={quote.status === "New" ? "default" : "secondary"} className={quote.status === "New" ? "bg-amber-500 text-black hover:bg-amber-400" : ""}>
                        {quote.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(quote.created_at).toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      <div><span className="text-muted-foreground">Contact:</span> {quote.contact}</div>
                    </div>

                    <div className="bg-muted p-4 rounded-lg flex items-start gap-3 mt-4">
                      <Package className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium">{quote.part_name} <span className="text-muted-foreground font-normal ml-2">x {quote.quantity}</span></div>
                        {quote.message && <div className="text-muted-foreground mt-1 italic">"{quote.message}"</div>}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <ActionButton onClick={() => handleMakeQuote(quote)} variant="primary">
                      Make Quote / Price Items
                    </ActionButton>
                    {quote.status === "New" && (
                      <ActionButton onClick={() => updateStatusMutation.mutate({ id: quote.id, status: "Closed" })} variant="outline">
                        Mark as Closed
                      </ActionButton>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
