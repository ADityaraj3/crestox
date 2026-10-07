"use client";

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Landmark,
  Smartphone,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getBankDetailsStatus,
  sendBankDetailsLink,
  submitBankDetails,
  type BankDetailsStatus,
} from '@/apis/withdrawal/withdrawalActions';

type PaymentMethod = 'bank' | 'upi';

function BankDetailsContent() {
  const searchParams = useSearchParams();
  const isAddMode = searchParams.get('add') === '1';
  // Proof that the owner opened the emailed link; the API refuses changes without it.
  const verificationToken = searchParams.get('token') ?? '';
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [existingDetails, setExistingDetails] = useState<BankDetailsStatus | null>(null);

  const [method, setMethod] = useState<PaymentMethod>('bank');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [upiPhone, setUpiPhone] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getBankDetailsStatus();
        setExistingDetails(data);
        // In add mode, always show the form so users can add another method.
        if (data.has_fund_account && !isAddMode) {
          setSuccess(true);
        }
      } catch {
        // User may not be logged in
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAddMode]);

  const bankValid =
    accountName.length >= 2 &&
    accountNumber.length >= 5 &&
    accountNumber === confirmAccountNumber &&
    /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase());

  const upiValid =
    accountName.length >= 2 &&
    /^[\w.\-]+@[\w]+$/.test(upiId);

  const isValid = method === 'bank' ? bankValid : upiValid;

  const handleSendLink = async () => {
    setSendingLink(true);
    try {
      await sendBankDetailsLink({ add_method: isAddMode });
      setLinkSent(true);
      toast.success('We emailed you a secure link. Open it to continue.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not send the link. Please sign in and try again.');
    } finally {
      setSendingLink(false);
    }
  };

  const handleSubmit = async () => {
    if (!isValid || !verificationToken) return;
    setSubmitting(true);
    try {
      const data =
        method === 'bank'
          ? {
              verification_token: verificationToken,
              account_holder_name: accountName,
              account_number: accountNumber,
              ifsc: ifsc.toUpperCase(),
            }
          : {
              verification_token: verificationToken,
              account_holder_name: accountName,
              upi_id: upiId,
              upi_phone_number: upiPhone || undefined,
            };

      await submitBankDetails(data);
      setSuccess(true);
      toast.success('Bank details saved successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save bank details');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-background text-foreground">
      <div className="fixed inset-0 z-0 pointer-events-none noise-overlay" />
      <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-void opacity-80" />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-lg"
        >
          {/* Logo */}
          <div className="text-center mb-8 mt-8">
            <h1 className="text-lg font-bold tracking-[6px] text-foreground font-sans">
              C R E S T O X
            </h1>
            <p className="text-xs text-muted-foreground tracking-wider mt-1">
              FRACTIONAL ART INVESTMENT
            </p>
          </div>

          <div className="bg-background/80 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Landmark size={20} className="text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-serif font-medium text-foreground">
                    {isAddMode ? 'Add Payment Method' : 'Bank Details'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {isAddMode
                      ? 'Add a bank account or UPI for withdrawals'
                      : 'Required to process your withdrawal'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 size={28} className="animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              ) : success ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-green-500" />
                  </div>
                  <h3 className="text-lg font-serif font-medium text-foreground">
                    Bank Details Saved
                  </h3>
                  <p className="text-sm text-muted-foreground text-center max-w-xs">
                    Your payout account has been configured. Any pending withdrawals will now be processed by our team.
                  </p>
                  {existingDetails?.bank_account_number && (
                    <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-border/50 text-center">
                      <p className="text-xs text-muted-foreground mb-1">Account on file</p>
                      <p className="font-mono text-sm text-foreground">
                        {existingDetails.bank_ifsc} • {existingDetails.bank_account_number}
                      </p>
                    </div>
                  )}
                  {existingDetails?.upi_id && (
                    <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-border/50 text-center">
                      <p className="text-xs text-muted-foreground mb-1">UPI on file</p>
                      <p className="font-mono text-sm text-foreground">{existingDetails.upi_id}</p>
                    </div>
                  )}
                </div>
              ) : !verificationToken ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <AlertCircle size={32} className="text-blue-500" />
                  </div>
                  <h3 className="text-lg font-serif font-medium text-foreground">
                    Open the secure link from your email
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    For your security, payout details can only be changed from the link we email to
                    you. Links expire after 30 minutes.
                  </p>
                  <button
                    onClick={handleSendLink}
                    disabled={sendingLink || linkSent}
                    className="mt-2 px-6 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    {sendingLink ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Sending...
                      </>
                    ) : linkSent ? (
                      'Link sent — check your inbox'
                    ) : (
                      'Email me a secure link'
                    )}
                  </button>
                </div>
              ) : (
                <>
                  {/* Method Selector */}
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => setMethod('bank')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all border ${
                        method === 'bank'
                          ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                          : 'bg-muted/30 text-muted-foreground border-border hover:border-border/80'
                      }`}
                    >
                      <Landmark size={16} />
                      Bank Account
                    </button>
                    <button
                      onClick={() => setMethod('upi')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all border ${
                        method === 'upi'
                          ? 'bg-blue-500/10 text-blue-500 border-blue-500/30'
                          : 'bg-muted/30 text-muted-foreground border-border hover:border-border/80'
                      }`}
                    >
                      <Smartphone size={16} />
                      UPI
                    </button>
                  </div>

                  {/* Common: Account Holder Name */}
                  <div className="mb-4">
                    <label className="block text-xs text-muted-foreground font-sans mb-1.5">
                      Account Holder Name *
                    </label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="Full name as per bank records"
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                    />
                  </div>

                  {method === 'bank' ? (
                    <>
                      <div className="mb-4">
                        <label className="block text-xs text-muted-foreground font-sans mb-1.5">
                          Account Number *
                        </label>
                        <input
                          type="text"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="Enter account number"
                          className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                        />
                      </div>
                      <div className="mb-4">
                        <label className="block text-xs text-muted-foreground font-sans mb-1.5">
                          Confirm Account Number *
                        </label>
                        <input
                          type="text"
                          value={confirmAccountNumber}
                          onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="Re-enter account number"
                          className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                        />
                        {confirmAccountNumber && accountNumber !== confirmAccountNumber && (
                          <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                            <AlertCircle size={12} />
                            Account numbers don't match
                          </p>
                        )}
                      </div>
                      <div className="mb-6">
                        <label className="block text-xs text-muted-foreground font-sans mb-1.5">
                          IFSC Code *
                        </label>
                        <input
                          type="text"
                          value={ifsc}
                          onChange={(e) => setIfsc(e.target.value.toUpperCase().slice(0, 11))}
                          placeholder="e.g. HDFC0000053"
                          maxLength={11}
                          className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all uppercase"
                        />
                        {ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc) && (
                          <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                            <AlertCircle size={12} />
                            Invalid IFSC format
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mb-4">
                        <label className="block text-xs text-muted-foreground font-sans mb-1.5">
                          UPI ID *
                        </label>
                        <input
                          type="text"
                          value={upiId}
                          onChange={(e) => setUpiId(e.target.value.toLowerCase())}
                          placeholder="e.g. yourname@upi"
                          className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                        />
                        {upiId && !/^[\w.\-]+@[\w]+$/.test(upiId) && (
                          <p className="mt-1 text-xs text-destructive flex items-center gap-1">
                            <AlertCircle size={12} />
                            Invalid UPI ID format
                          </p>
                        )}
                      </div>
                      <div className="mb-6">
                        <label className="block text-xs text-muted-foreground font-sans mb-1.5">
                          Phone Number linked to UPI (optional)
                        </label>
                        <input
                          type="tel"
                          value={upiPhone}
                          onChange={(e) => setUpiPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="10-digit mobile number"
                          maxLength={10}
                          className="w-full px-4 py-3 bg-background border border-border rounded-lg text-sm font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                        />
                      </div>
                    </>
                  )}

                  {/* Security Notice */}
                  <div className="mb-6 p-3 bg-muted/20 border border-border/50 rounded-lg">
                    <p className="text-[10px] tracking-wider uppercase text-muted-foreground font-sans font-medium mb-1">
                      Security Notice
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Your bank details are encrypted and stored securely. They are only used to
                      process your approved withdrawal requests via Razorpay.
                    </p>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={!isValid || submitting}
                    className="w-full py-3.5 rounded-xl font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Verifying & Saving...
                      </>
                    ) : (
                      <>
                        Save Bank Details
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-[10px] text-muted-foreground mt-6 mb-8">
            © {new Date().getFullYear()} Crestox. Your data is encrypted and secure.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function BankDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 size={28} className="animate-spin text-muted-foreground" />
        </div>
      }
    >
      <BankDetailsContent />
    </Suspense>
  );
}

