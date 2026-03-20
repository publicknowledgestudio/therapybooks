"use client";

import { Button } from "@/components/ui/button";
import { Copy, WhatsappLogo, XCircle } from "@/components/ui/icons";
import { toast } from "sonner";
import { voidReceipt } from "./actions";

interface ReceiptActionsProps {
  receiptId: number;
  clientName: string;
  clientPhone: string | null;
  isVoid: boolean;
}

export function ReceiptActions({
  receiptId,
  clientName,
  clientPhone,
  isVoid,
}: ReceiptActionsProps) {
  const url = `${window.location.origin}/receipt/${receiptId}`;

  function handleCopy() {
    navigator.clipboard.writeText(url);
    toast.success("Receipt link copied");
  }

  function handleWhatsApp() {
    const message = `Hi ${clientName}, here's your payment receipt: ${url}`;
    window.open(
      `https://wa.me/${clientPhone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  }

  async function handleVoid() {
    if (!confirm("Are you sure you want to void this receipt?")) return;
    const result = await voidReceipt(receiptId);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Receipt voided");
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" onClick={handleCopy}>
        <Copy className="h-4 w-4" />
      </Button>
      {clientPhone && (
        <Button variant="ghost" size="sm" onClick={handleWhatsApp}>
          <WhatsappLogo className="h-4 w-4" />
        </Button>
      )}
      {!isVoid && (
        <Button variant="ghost" size="sm" onClick={handleVoid}>
          <XCircle className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
