import { createContext, useContext, useState, ReactNode } from "react";
import { format } from "date-fns";

interface AdminToolsState {
  // Dashboard
  date: string;
  setDate: (d: string) => void;
  // BookLoans
  loanDialogOpen: boolean;
  setLoanDialogOpen: (b: boolean) => void;
  loanRefreshKey: number;
  bumpLoanRefresh: () => void;
}

const Ctx = createContext<AdminToolsState | null>(null);

export const AdminToolsProvider = ({ children }: { children: ReactNode }) => {
  const today = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(today);
  const [loanDialogOpen, setLoanDialogOpen] = useState(false);
  const [loanRefreshKey, setKey] = useState(0);
  return (
    <Ctx.Provider
      value={{
        date,
        setDate,
        loanDialogOpen,
        setLoanDialogOpen,
        loanRefreshKey,
        bumpLoanRefresh: () => setKey((k) => k + 1),
      }}
    >
      {children}
    </Ctx.Provider>
  );
};

export const useAdminTools = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdminTools must be inside AdminToolsProvider");
  return v;
};
