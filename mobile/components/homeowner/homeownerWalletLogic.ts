import type { PrepaidCommitment, WalletTransaction } from "@emappa/shared";
import type { CashflowLedgerRow } from "../shared/CashflowLedger";

const HOST_ROYALTY_RE = /host[_\s-]?royalty/i;
const SELF_PAYMENT_RE = /self[-\s]?payment|paid yourself|circular/i;

export function isHostRoyaltyTransaction(tx: WalletTransaction) {
  return tx.kind === "royalty" && HOST_ROYALTY_RE.test(tx.reference);
}

export function isSelfPaymentTransaction(tx: WalletTransaction) {
  return SELF_PAYMENT_RE.test(tx.reference);
}

export function homeownerCashflowTransactions(transactions: WalletTransaction[]) {
  return transactions.filter((tx) => !isHostRoyaltyTransaction(tx) && !isSelfPaymentTransaction(tx));
}

export function homeownerShareEarningsKes(transactions: WalletTransaction[]) {
  return homeownerCashflowTransactions(transactions)
    .filter((tx) => tx.kind === "capital_return")
    .reduce((total, tx) => total + Math.max(0, tx.amountKes), 0);
}

export function homeownerSavingsOffsetKes({
  generationKwh,
  loadKwh,
  settlementSold,
}: {
  generationKwh: number;
  loadKwh: number;
  settlementSold?: number;
}) {
  const sold = settlementSold ?? Math.min(generationKwh, loadKwh);
  return Math.round(sold * 10);
}

export function toCashflowLedgerRows(transactions: WalletTransaction[]): CashflowLedgerRow[] {
  return homeownerCashflowTransactions(transactions).map((tx) => ({
    id: tx.id,
    label: cashflowLabel(tx),
    amount: formatSignedKes(tx.amountKes),
    note: `${tx.kind} · ${formatShortDate(tx.at)}`,
    tone: tx.amountKes >= 0 ? "in" : "out",
  }));
}

export function pledgeStatusTone(status: PrepaidCommitment["status"]) {
  if (status === "confirmed") {
    return "good" as const;
  }
  if (status === "failed") {
    return "bad" as const;
  }
  return "warn" as const;
}

function cashflowLabel(tx: WalletTransaction) {
  if (tx.kind === "pledge") {
    return tx.amountKes < 0 ? "Pledge out" : "Pledge / top-up";
  }
  if (tx.kind === "royalty") {
    return "Avoided grid cost";
  }
  if (tx.kind === "capital_return") {
    return "Ownership payout";
  }
  return tx.reference;
}

function formatSignedKes(amount: number) {
  const prefix = amount < 0 ? "−" : "+";
  return `${prefix} KSh ${Math.abs(Math.round(amount)).toLocaleString()}`;
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString();
}
