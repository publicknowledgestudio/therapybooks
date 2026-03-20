"use client";

import { Button } from "@/components/ui/button";
import { Copy, WhatsappLogo } from "@/components/ui/icons";
import { toast } from "sonner";

interface ReceiptPageActionsProps {
  clientName: string;
  clientPhone: string | null;
}

export function ReceiptPageActions({
  clientName,
  clientPhone,
}: ReceiptPageActionsProps) {
  function handlePrint() {
    window.print();
  }

  function handleCopy() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Receipt link copied");
  }

  function handleWhatsApp() {
    const url = window.location.href;
    const message = `Hi ${clientName}, here's your payment receipt: ${url}`;
    window.open(
      `https://wa.me/${clientPhone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  }

  return (
    <div className="no-print flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleCopy}>
        <Copy className="mr-1.5 h-4 w-4" />
        Copy Link
      </Button>
      {clientPhone && (
        <Button variant="outline" size="sm" onClick={handleWhatsApp}>
          <WhatsappLogo className="mr-1.5 h-4 w-4" />
          WhatsApp
        </Button>
      )}
      <Button size="sm" onClick={handlePrint}>
        Print
      </Button>
    </div>
  );
}
