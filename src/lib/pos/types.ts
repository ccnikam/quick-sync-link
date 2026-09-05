export type Role = "owner" | "manager" | "cook" | "waiter" | "helper";

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner",
  manager: "Manager",
  cook: "Kitchen",
  waiter: "Waiter",
  helper: "Helper",
};

export type Task = {
  id: string;
  title: string;
  note?: string | undefined;
  /** staff id, or "all" for everyone */
  assignedTo: string;
  assignedName: string;
  createdBy: string;
  status: "open" | "done";
  createdAt: number;
  doneAt?: number | undefined;
};

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  tracked?: boolean;
};

export type OrderLine = {
  lineId: string;
  itemId: string;
  name: string;
  price: number;
  qty: number;
  note?: string | undefined;
  kotSent?: boolean;
  deducted?: boolean;
};

export type TableStatus = "available" | "occupied" | "borrow" | "paid";

export type TableDoc = {
  id: number;
  status: TableStatus;
  items: OrderLine[];
  customer?: string | undefined;
  discountPct: number;
  openedAt?: number | undefined;
};

export type PaymentMode = "cash" | "upi" | "card" | "borrow";

export type PaymentPart = { mode: PaymentMode; amount: number };

export type Bill = {
  id: string;
  no: number;
  tableId: number;
  items: OrderLine[];
  subtotal: number;
  discountPct: number;
  discountAmt: number;
  total: number;
  /** Primary mode (first payment part) — kept for older bills. */
  mode: PaymentMode;
  /** Split tender, e.g. [{cash,421},{upi,178}]. Absent on older bills. */
  payments?: PaymentPart[] | undefined;
  customer?: string | undefined;
  createdAt: number;
  voided?: boolean;
  settledBy?: string | undefined;
};

export type KotStatus = "new" | "preparing" | "ready" | "served";

export type Kot = {
  id: string;
  no: number;
  tableId: number;
  items: { name: string; qty: number; note?: string | undefined }[];
  status: KotStatus;
  createdAt: number;
};

export type StockItem = {
  id: string;
  name: string;
  qty: number;
  min: number;
};

export type Staff = {
  id: string;
  name: string;
  role: Role;
  pin: string;
};

export type Settings = {
  shopKey: string | null;
  syncEnabled: boolean;
  billCounter: number;
  kotCounter: number;
  allowNegativeStock: boolean;
};

export type DocKind = "table" | "bill" | "kot" | "stock" | "staff" | "settings" | "task";

export type Doc = {
  kind: DocKind;
  id: string;
  data: unknown;
  updatedAt: number;
  deleted?: boolean;
};

export const HOTEL = {
  name: "HOTEL KUSUM PALACE",
  sub: "PURE VEG",
  tagline: "Swad Jo Yaad Rahe!",
  phone: "9975149205",
  tables: 21,
};
