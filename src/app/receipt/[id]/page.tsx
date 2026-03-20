import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { formatINR } from "@/lib/format";
import { ReceiptPageActions } from "./receipt-actions";

interface ReceiptSession {
  session_id: number;
  amount: number;
  sessions: {
    date: string;
    start_time: string | null;
    end_time: string | null;
    duration_minutes: number | null;
    rate: number | null;
  } | null;
}

interface ReceiptData {
  id: number;
  receipt_number: number;
  date: string;
  total_amount: number;
  status: string;
  payment_method: string | null;
  transaction_id: string | null;
  user_id: string;
  clients: { name: string; email: string | null; phone: string | null } | null;
  receipt_sessions: ReceiptSession[];
}

interface TherapistSettings {
  practice_name: string | null;
  practice_address: string | null;
  practice_phone: string | null;
  pan_number: string | null;
  registration_number: string | null;
  clinic_address: string | null;
}

export default async function PublicReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: receipt } = await (supabase as any)
    .from("receipts")
    .select(
      `
      id,
      receipt_number,
      date,
      total_amount,
      status,
      payment_method,
      transaction_id,
      user_id,
      clients(name, email, phone),
      receipt_sessions(session_id, amount, sessions(date, start_time, end_time, duration_minutes, rate))
    `
    )
    .eq("id", Number(id))
    .single();

  if (!receipt) notFound();

  const receiptData = receipt as unknown as ReceiptData;

  const { data: settingsData } = await supabase
    .from("therapist_settings")
    .select(
      "practice_name, practice_address, practice_phone, pan_number, registration_number, clinic_address"
    )
    .eq("user_id", receiptData.user_id)
    .single();

  const settings = (settingsData as unknown as TherapistSettings) ?? {};

  const isVoid = receiptData.status === "void";

  const formattedDate = new Date(receiptData.date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const paymentMethodLabel =
    (receiptData.payment_method ?? "").toLowerCase() === "cash"
      ? "Cash"
      : "Bank Transfer";

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              .no-print { display: none !important; }
              @page { margin: 1cm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          `,
        }}
      />
      <div className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white print:py-0">
        <div className="relative mx-auto max-w-2xl rounded-lg bg-white p-8 shadow-sm print:shadow-none print:p-0">
          {/* VOID watermark */}
          {isVoid && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
              <span className="text-red-500 opacity-10 text-[120px] font-bold -rotate-45 select-none">
                VOID
              </span>
            </div>
          )}

          {/* Actions (top right, hidden in print) */}
          <div className="flex justify-end mb-6">
            <ReceiptPageActions
              clientName={receiptData.clients?.name ?? ""}
              clientPhone={receiptData.clients?.phone ?? null}
            />
          </div>

          {/* Practice header */}
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {settings.practice_name ?? "Therapy Practice"}
            </h1>
            {settings.clinic_address && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {settings.clinic_address}
              </p>
            )}
            {settings.practice_phone && (
              <p className="text-sm text-muted-foreground">
                {settings.practice_phone}
              </p>
            )}
            {(settings.pan_number || settings.registration_number) && (
              <p className="text-xs text-muted-foreground mt-1">
                {settings.pan_number && <>PAN: {settings.pan_number}</>}
                {settings.pan_number && settings.registration_number && (
                  <> &middot; </>
                )}
                {settings.registration_number && (
                  <>Reg: {settings.registration_number}</>
                )}
              </p>
            )}
          </div>

          <hr className="my-6 border-border" />

          {/* Receipt heading */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              PAYMENT RECEIPT
            </h2>
            <span className="font-mono text-sm text-muted-foreground">
              #{String(receiptData.receipt_number).padStart(3, "0")}
            </span>
          </div>

          <p className="text-sm text-muted-foreground mt-1">{formattedDate}</p>

          <p className="text-sm mt-4">
            <span className="text-muted-foreground">Received from:</span>{" "}
            <span className="font-medium">
              {receiptData.clients?.name ?? "—"}
            </span>
          </p>

          {/* Sessions table */}
          {receiptData.receipt_sessions.length > 0 && (
            <div className="mt-6 rounded border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-muted-foreground">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Duration</th>
                    <th className="px-4 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptData.receipt_sessions.map((rs) => (
                    <tr key={rs.session_id} className="border-t">
                      <td className="px-4 py-2.5">
                        {rs.sessions
                          ? new Date(rs.sessions.date).toLocaleDateString(
                              "en-GB",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              }
                            )
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {rs.sessions?.duration_minutes
                          ? `${rs.sessions.duration_minutes} min`
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {formatINR(rs.amount)}
                      </td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="border-t font-semibold">
                    <td className="px-4 py-2.5" colSpan={2}>
                      Total
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {formatINR(receiptData.total_amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {receiptData.receipt_sessions.length === 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold">
                Total: {formatINR(receiptData.total_amount)}
              </p>
            </div>
          )}

          {/* Payment method */}
          <p className="text-sm text-muted-foreground mt-4">
            Payment method: {paymentMethodLabel}
          </p>

          {/* Footer */}
          <div className="mt-10 pt-6 border-t text-sm text-muted-foreground">
            {settings.practice_name ?? "Therapy Practice"}
          </div>
        </div>
      </div>
    </>
  );
}
