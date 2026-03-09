"use client";

import { InlineField } from "@/components/ui/inline-field";
import { formatINR } from "@/lib/format";

interface ClientProfileProps {
  client: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    current_rate: number | null;
    opening_balance: number;
    notes: string | null;
  };
}

export function ClientProfile({ client }: ClientProfileProps) {
  return (
    <div className="rounded-lg border border-border">
      {/* Name — full width */}
      <div className="border-b border-border">
        <InlineField
          label="Name"
          value={client.name}
          field="name"
          clientId={client.id}
          required
        />
      </div>

      {/* Email + Phone row */}
      <div className="grid border-b border-border sm:grid-cols-2">
        <div className="border-b border-border sm:border-b-0 sm:border-r">
          <InlineField
            label="Email"
            value={client.email}
            field="email"
            clientId={client.id}
            type="email"
            placeholder="client@example.com"
          />
        </div>
        <div>
          <InlineField
            label="Phone"
            value={client.phone}
            field="phone"
            clientId={client.id}
            type="tel"
            placeholder="+91 98765 43210"
          />
        </div>
      </div>

      {/* Rate + Opening Balance row */}
      <div className="grid border-b border-border sm:grid-cols-2">
        <div className="border-b border-border sm:border-b-0 sm:border-r">
          <InlineField
            label="Session Rate (INR)"
            value={client.current_rate}
            field="current_rate"
            clientId={client.id}
            type="number"
            placeholder="2000"
            format={(v) => (v !== null && v !== "" ? formatINR(Number(v)) : "")}
          />
        </div>
        <div>
          <InlineField
            label="Opening Balance (INR)"
            value={client.opening_balance}
            field="opening_balance"
            clientId={client.id}
            type="number"
            placeholder="0"
            format={(v) => (v !== null && v !== "" && Number(v) !== 0 ? formatINR(Number(v)) : "")}
          />
        </div>
      </div>

      {/* Notes — full width */}
      <div>
        <InlineField
          label="Notes"
          value={client.notes}
          field="notes"
          clientId={client.id}
          type="textarea"
          placeholder="Add private notes about this client..."
        />
      </div>
    </div>
  );
}
