import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  name: string;
  username: string;
  role: "ADMIN" | "REP";
  phone: string | null;
  allocatedInventory: number;
  isActive: boolean;
}

export interface Client {
  id: string;
  repId: string;
  name: string;
  businessName: string | null;
  phone: string | null;
  address: string | null;
  category: string | null;
  notes: string | null;
  walletBalance: number;
  createdAt: string;
}

export interface Invoice {
  id: string;
  repId: string;
  clientId: string;
  productId: string | null;
  productSize: string;
  quantity: number;
  price: number;
  total: number;
  discountType: string;
  discountValue: number;
  finalTotal: number;
  promotionQty: number;
  paidAmount: number;
  debtAmount: number;
  creditAmount: number;
  synced: boolean;
  createdAt: string;
  client?: Client;
}

export interface RequestItem {
  id: string;
  repId: string;
  type: string;
  entityType: string;
  entityId: string;
  reason: string;
  status: string;
  adminNote: string | null;
  createdAt: string;
  rep?: User;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  relatedId: string | null;
  createdAt: string;
}

export interface InvoiceDraft {
  clientId: string;
  productSize: string;
  quantity: number;
  price: number;
}

export interface ActivityLogItem {
  id: string;
  repId: string | null;
  action: string;
  details: string | null;
  createdAt: string;
  rep?: User;
}

export interface Receipt {
  id: string;
  repId: string;
  clientId: string;
  receiptNo: string;
  amount: number;
  method: string;
  notes: string | null;
  createdAt: string;
  client?: Client;
}

export interface Product {
  id: string;
  name: string;
  size: string;
  price: number;
  isActive: boolean;
  createdAt: string;
}

export interface CallLogItem {
  id: string;
  repId: string;
  clientId: string;
  type: string;
  duration: number | null;
  notes: string | null;
  createdAt: string;
  rep?: User;
  client?: Client;
}

export interface DailyGoal {
  id: string;
  repId: string;
  targetRevenue: number;
  targetClients: number;
  actualRevenue: number;
  actualClients: number;
  date: string;
  createdAt: string;
}

interface AppState {
  // Invoice duplication
  duplicateInvoiceData: InvoiceDraft | null;
  setDuplicateInvoiceData: (data: InvoiceDraft | null) => void;

  // Auth
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;

  // View State
  currentView: "login" | "rep" | "admin";
  setCurrentView: (view: "login" | "rep" | "admin") => void;

  // Rep Navigation
  repTab: "home" | "clients" | "create-invoice" | "invoices" | "expenses" | "requests" | "profile";
  setRepTab: (tab: "home" | "clients" | "create-invoice" | "invoices" | "expenses" | "requests" | "profile") => void;

  // Admin Navigation
  adminTab: "dashboard" | "reports" | "reps" | "clients" | "invoices" | "receipts" | "products" | "requests" | "activity" | "notifications" | "settings";
  setAdminTab: (tab: "dashboard" | "reports" | "reps" | "clients" | "invoices" | "receipts" | "products" | "requests" | "activity" | "notifications" | "settings") => void;

  // Selected items
  selectedClientId: string | null;
  setSelectedClientId: (id: string | null) => void;

  // Sync status
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;

  // Pending operations (offline queue)
  pendingOperations: Array<{ id: string; type: string; data: unknown; timestamp: string }>;
  addPendingOperation: (op: { id: string; type: string; data: unknown }) => void;
  clearPendingOperation: (id: string) => void;

  // Local data cache
  clients: Client[];
  setClients: (clients: Client[]) => void;
  invoices: Invoice[];
  setInvoices: (invoices: Invoice[]) => void;
  notifications: NotificationItem[];
  setNotifications: (notifications: NotificationItem[]) => void;

  // Settings
  sizeVariationsEnabled: boolean;
  setSizeVariationsEnabled: (enabled: boolean) => void;

  // Dialog state
  requestDialogOpen: boolean;
  setRequestDialogOpen: (open: boolean) => void;
  requestEntityType: "client" | "invoice" | null;
  setRequestEntityType: (type: "client" | "invoice" | null) => void;
  requestActionType: "edit" | "delete" | null;
  setRequestActionType: (type: "edit" | "delete" | null) => void;
  requestEntityId: string | null;
  setRequestEntityId: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Invoice duplication
      duplicateInvoiceData: null,
      setDuplicateInvoiceData: (duplicateInvoiceData) => set({ duplicateInvoiceData }),

      // Auth
      user: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),

      // View State
      currentView: "login",
      setCurrentView: (currentView) => set({ currentView }),

      // Rep Navigation
      repTab: "home",
      setRepTab: (repTab) => set({ repTab }),

      // Admin Navigation
      adminTab: "dashboard",
      setAdminTab: (adminTab) => set({ adminTab }),

      // Selected items
      selectedClientId: null,
      setSelectedClientId: (selectedClientId) => set({ selectedClientId }),

      // Sync status
      isOnline: navigator?.onLine ?? true,
      setIsOnline: (isOnline) => set({ isOnline }),

      // Pending operations
      pendingOperations: [],
      addPendingOperation: (op) =>
        set((state) => ({
          pendingOperations: [
            ...state.pendingOperations,
            { ...op, timestamp: new Date().toISOString() },
          ],
        })),
      clearPendingOperation: (id) =>
        set((state) => ({
          pendingOperations: state.pendingOperations.filter((op) => op.id !== id),
        })),

      // Local data cache
      clients: [],
      setClients: (clients) => set({ clients }),
      invoices: [],
      setInvoices: (invoices) => set({ invoices }),
      notifications: [],
      setNotifications: (notifications) => set({ notifications }),

      // Settings
      sizeVariationsEnabled: false,
      setSizeVariationsEnabled: (sizeVariationsEnabled) =>
        set({ sizeVariationsEnabled }),

      // Dialog state
      requestDialogOpen: false,
      setRequestDialogOpen: (requestDialogOpen) => set({ requestDialogOpen }),
      requestEntityType: null,
      setRequestEntityType: (requestEntityType) => set({ requestEntityType }),
      requestActionType: null,
      setRequestActionType: (requestActionType) => set({ requestActionType }),
      requestEntityId: null,
      setRequestEntityId: (requestEntityId) => set({ requestEntityId }),
    }),
    {
      name: "jaba-water-store",
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        currentView: state.currentView,
        repTab: state.repTab,
        adminTab: state.adminTab,
        isOnline: state.isOnline,
        pendingOperations: state.pendingOperations,
        sizeVariationsEnabled: state.sizeVariationsEnabled,
      }),
    }
  )
);
