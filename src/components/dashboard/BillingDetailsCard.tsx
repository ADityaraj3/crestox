"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Receipt, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useUserStore } from "@/store/useUserStore";
import { updateBillingDetails } from "@/apis/user/userActions";

// GST state codes (place of supply on invoices).
const STATES: Array<[string, string]> = [
  ["35", "Andaman & Nicobar"], ["37", "Andhra Pradesh"], ["12", "Arunachal Pradesh"], ["18", "Assam"],
  ["10", "Bihar"], ["04", "Chandigarh"], ["22", "Chhattisgarh"], ["26", "Dadra & Nagar Haveli and Daman & Diu"],
  ["07", "Delhi"], ["30", "Goa"], ["24", "Gujarat"], ["06", "Haryana"], ["02", "Himachal Pradesh"],
  ["01", "Jammu & Kashmir"], ["20", "Jharkhand"], ["29", "Karnataka"], ["32", "Kerala"], ["38", "Ladakh"],
  ["31", "Lakshadweep"], ["23", "Madhya Pradesh"], ["27", "Maharashtra"], ["14", "Manipur"], ["17", "Meghalaya"],
  ["15", "Mizoram"], ["13", "Nagaland"], ["21", "Odisha"], ["34", "Puducherry"], ["03", "Punjab"],
  ["08", "Rajasthan"], ["11", "Sikkim"], ["33", "Tamil Nadu"], ["36", "Telangana"], ["16", "Tripura"],
  ["09", "Uttar Pradesh"], ["05", "Uttarakhand"], ["19", "West Bengal"],
];

const GSTIN = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function BillingDetailsCard() {
  const user = useUserStore((s) => s.user);
  const fetchProfile = useUserStore((s) => s.fetchProfile);
  const [state, setState] = useState("");
  const [gstin, setGstin] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setState(user?.billing_state_code ?? "");
    setGstin(user?.gstin ?? "");
  }, [user?.billing_state_code, user?.gstin]);

  const gstinValue = gstin.trim().toUpperCase();
  const gstinError =
    gstinValue && !GSTIN.test(gstinValue)
      ? "Enter a valid 15-character GSTIN."
      : gstinValue && state && gstinValue.slice(0, 2) !== state
        ? "The GSTIN's first two digits must match the billing state."
        : null;

  const save = async () => {
    if (gstinError) return;
    setSaving(true);
    try {
      await updateBillingDetails({ billing_state_code: state || null, gstin: gstinValue || null });
      toast.success("Billing details saved");
      await fetchProfile?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Could not save billing details");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      className="glass-capsule p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <Receipt className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-label">Billing details for GST invoices</h3>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Billing state</span>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full h-10 border border-border bg-transparent px-3"
          >
            <option value="">Not set</option>
            {STATES.map(([code, name]) => (
              <option key={code} value={code}>
                {name} ({code})
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">GSTIN (optional, for businesses)</span>
          <input
            value={gstin}
            onChange={(e) => setGstin(e.target.value)}
            placeholder="27ABCDE1234F1Z5"
            className="w-full h-10 border border-border bg-transparent px-3 uppercase"
          />
          {gstinError && <span className="text-xs text-destructive">{gstinError}</span>}
        </label>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Your billing state decides whether GST on your purchases is charged as IGST or as CGST + SGST.
      </p>
      <button
        type="button"
        onClick={save}
        disabled={saving || Boolean(gstinError)}
        className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-border text-sm disabled:opacity-50"
      >
        {saving && <LoaderCircle className="w-4 h-4 animate-spin" />}
        Save billing details
      </button>
    </motion.div>
  );
}
