"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Shield,
  CreditCard,
  Moon,
  Monitor,
  Sun,
  Key,
  LoaderCircle,
  Landmark,
  Smartphone,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { usePasskeyAuth } from "@/hooks/usePasskeyAuth";
import { toast } from "sonner";
import { BillingDetailsCard } from "./BillingDetailsCard";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/apis/user/userActions";
import {
  getBankDetailsStatus,
  sendBankDetailsLink,
  setDefaultPaymentMethod,
  type PaymentMethod,
} from "@/apis/withdrawal/withdrawalActions";

interface SettingToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
}

const SettingToggle = ({
  label,
  description,
  enabled,
  onChange,
  disabled,
}: SettingToggleProps) => (
  <div className="flex items-center justify-between gap-4 py-4 border-b border-border">
    <div className="min-w-0">
      <p className="text-sm text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full border transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-40",
        enabled
          ? "border-primary bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.18)]"
          : "border-border bg-muted/80 dark:bg-muted/40"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full shadow-sm transition-all duration-200",
          enabled
            ? "left-[calc(100%-1.375rem)] bg-primary-foreground"
            : "left-0.5 bg-muted-foreground/70 dark:bg-muted-foreground/50"
        )}
      />
    </button>
  </div>
);

const DEFAULT_PREFS: NotificationPreferences = {
  sale_notifications: true,
  price_alerts: true,
  curator_updates: true,
  login_alerts: true,
};

export const SettingsTab = () => {
  const { registerPasskey, isLoading: passkeyLoading } = usePasskeyAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [passkeyRegistered, setPasskeyRegistered] = useState(false);

  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [sendingLink, setSendingLink] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [preferences, bankStatus] = await Promise.all([
          getNotificationPreferences(),
          getBankDetailsStatus(),
        ]);
        setPrefs({ ...DEFAULT_PREFS, ...preferences });
        setPaymentMethods(bankStatus.methods ?? []);
      } catch (err: any) {
        toast.error(
          err?.response?.data?.message ?? "Failed to load settings"
        );
      } finally {
        setPrefsLoading(false);
        setPaymentsLoading(false);
      }
    };
    void load();
  }, []);

  const handleRegisterPasskey = async () => {
    const success = await registerPasskey();
    if (success) {
      setPasskeyRegistered(true);
      toast.success(
        "Passkey registered successfully! You can now use it to log in."
      );
    }
  };

  const togglePref = async (key: keyof NotificationPreferences) => {
    const next = !prefs[key];
    const previous = prefs;
    setPrefs((p) => ({ ...p, [key]: next }));
    setSavingKey(key);
    try {
      const updated = await updateNotificationPreferences({ [key]: next });
      setPrefs({ ...DEFAULT_PREFS, ...updated });
    } catch (err: any) {
      setPrefs(previous);
      toast.error(
        err?.response?.data?.message ?? "Failed to update preference"
      );
    } finally {
      setSavingKey(null);
    }
  };

  const handleAddPaymentMethod = async () => {
    setSendingLink(true);
    try {
      const result = await sendBankDetailsLink({ add_method: true });
      toast.success(
        result?.message ??
          "We've emailed you a secure link to add a payment method."
      );
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ?? "Failed to send payment method link"
      );
    } finally {
      setSendingLink(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    setSettingDefaultId(id);
    try {
      await setDefaultPaymentMethod(id);
      setPaymentMethods((methods) =>
        methods.map((m) => ({ ...m, is_active: m.id === id }))
      );
      toast.success("Default payment method updated");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ?? "Failed to update default method"
      );
    } finally {
      setSettingDefaultId(null);
    }
  };

  const activeTheme = mounted ? theme ?? "system" : "system";

  return (
    <div className="max-w-8xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-3xl font-light text-foreground tracking-tight mb-2">
          Settings
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage your account and preferences
        </p>
      </motion.div>

      {/* Notifications */}
      <motion.div
        className="glass-capsule p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-label">Notifications</h3>
        </div>
        <div className="space-y-1">
          <SettingToggle
            label="Sale Notifications"
            description="Get notified when someone buys your fractals"
            enabled={prefs.sale_notifications}
            disabled={prefsLoading || savingKey === "sale_notifications"}
            onChange={() => void togglePref("sale_notifications")}
          />
          <SettingToggle
            label="Price Alerts"
            description="Receive alerts for significant market movements"
            enabled={prefs.price_alerts}
            disabled
            onChange={() => {}}
          />
          <SettingToggle
            label="Curator Updates"
            description="Updates on artwork review status"
            enabled={prefs.curator_updates}
            disabled={prefsLoading || savingKey === "curator_updates"}
            onChange={() => void togglePref("curator_updates")}
          />
        </div>
      </motion.div>

      {/* Security */}
      <motion.div
        className="glass-capsule p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-label">Security</h3>
        </div>
        <div className="space-y-1">
          <SettingToggle
            label="Two-Factor Authentication"
            description="Add an extra layer of security"
            enabled={true}
            onChange={() => {}}
          />
          <SettingToggle
            label="Login Alerts"
            description="Get notified of new login attempts"
            enabled={prefs.login_alerts}
            disabled={prefsLoading || savingKey === "login_alerts"}
            onChange={() => void togglePref("login_alerts")}
          />
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center gap-3 mb-2">
            <Key className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-medium text-foreground">Passkey</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Register a passkey to sign in with your fingerprint, face, or device
            PIN instead of email.
          </p>
          <button
            onClick={handleRegisterPasskey}
            disabled={passkeyLoading}
            className={cn(
              "px-4 py-2 text-sm border transition-colors flex items-center gap-2",
              passkeyRegistered
                ? "border-green-500/50 text-green-500 cursor-default"
                : "border-primary/50 text-primary hover:bg-primary/10"
            )}
          >
            {passkeyLoading ? (
              <>
                <LoaderCircle className="w-4 h-4 animate-spin" />
                Setting up...
              </>
            ) : passkeyRegistered ? (
              "Passkey registered"
            ) : (
              "Register a Passkey"
            )}
          </button>
        </div>
      </motion.div>

      <BillingDetailsCard />

      {/* Payment Methods */}
      <motion.div
        className="glass-capsule p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-label">Payment Methods</h3>
        </div>
        <div className="space-y-3">
          {paymentsLoading ? (
            <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <LoaderCircle className="w-4 h-4 animate-spin" />
              Loading payment methods...
            </div>
          ) : paymentMethods.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No payment methods yet. Add a bank account or UPI to withdraw
              funds.
            </p>
          ) : (
            paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between py-3 border border-border px-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {method.account_type === "UPI" ? (
                    <Smartphone className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <Landmark className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {method.account_type === "UPI"
                        ? method.upi_id ?? "UPI"
                        : method.bank_account_number ?? "Bank account"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {method.account_type === "UPI"
                        ? method.bank_account_name ?? "UPI"
                        : [method.bank_account_name, method.bank_ifsc]
                            .filter(Boolean)
                            .join(" · ")}
                    </p>
                  </div>
                </div>
                {method.is_active ? (
                  <span className="text-xs text-muted-foreground shrink-0 ml-3">
                    Default
                  </span>
                ) : (
                  <button
                    onClick={() => void handleSetDefault(method.id)}
                    disabled={settingDefaultId === method.id}
                    className="text-xs text-primary hover:underline shrink-0 ml-3 disabled:opacity-50"
                  >
                    {settingDefaultId === method.id
                      ? "Updating..."
                      : "Set default"}
                  </button>
                )}
              </div>
            ))
          )}
          <button
            onClick={() => void handleAddPaymentMethod()}
            disabled={sendingLink}
            className="w-full py-3 border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {sendingLink ? (
              <>
                <LoaderCircle className="w-4 h-4 animate-spin" />
                Sending link...
              </>
            ) : (
              "+ Add Payment Method"
            )}
          </button>
          <p className="text-xs text-muted-foreground">
            We&apos;ll email you a secure link to add bank or UPI details.
          </p>
        </div>
      </motion.div>

      {/* Appearance */}
      <motion.div
        className="glass-capsule p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Moon className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-label">Appearance</h3>
        </div>
        <div className="flex gap-4">
          {[
            { icon: Moon, label: "Dark", value: "dark" },
            { icon: Monitor, label: "System", value: "system" },
            { icon: Sun, label: "Light", value: "light" },
          ].map((option) => {
            const active = activeTheme === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={cn(
                  "flex-1 py-3 flex flex-col items-center gap-2 border transition-colors",
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-foreground/40"
                )}
              >
                <option.icon className="w-5 h-5" />
                <span className="text-xs">{option.label}</span>
                {option.value === "system" && mounted && (
                  <span className="text-[10px] text-muted-foreground">
                    ({resolvedTheme})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        className="border border-destructive/30 p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="text-label text-destructive mb-2">Danger Zone</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Irreversible actions. Please proceed with caution.
        </p>
        <div className="flex gap-4">
          <button className="px-4 py-2 border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
            Export Data
          </button>
          <button className="px-4 py-2 border border-destructive/50 text-sm text-destructive hover:bg-destructive/10 transition-colors">
            Delete Account
          </button>
        </div>
      </motion.div>
    </div>
  );
};
