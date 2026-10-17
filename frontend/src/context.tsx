import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { api } from "./api";
import { User } from "./types";
const Auth = createContext<{
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  async function refresh() {
    setUser(await api<User>("/auth/me"));
  }
  useEffect(() => {
    refresh()
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);
  async function logout() {
    await api("/auth/logout", "POST");
    setUser(null);
  }
  return (
    <Auth.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </Auth.Provider>
  );
}
export const useAuth = () => useContext(Auth);
