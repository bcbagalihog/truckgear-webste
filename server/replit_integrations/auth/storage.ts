import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

function getUsersVaultPath(): string {
  const possibleDirs = [
    "/run/user/1000/gvfs/sftp:host=192.168.254.121,user=bab/home/bab/Documents/truckgear-os/data",
    "/home/bab/Documents/truckgear-os/data",
    path.resolve(process.cwd(), "./data"),
  ];
  for (const d of possibleDirs) {
    if (fs.existsSync(d)) {
      return path.join(d, "users_vault.json");
    }
  }
  return path.resolve(process.cwd(), "./data/users_vault.json");
}

export function getVaultUsers(): any[] {
  const filePath = getUsersVaultPath();
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    } catch (e) {
      console.error("[USERS_VAULT] Failed to parse users vault:", e);
    }
  }
  
  // Seed default system users if missing
  const defaultUsers = [
    {
      id: "admin-1",
      username: "admin",
      email: "admin@truckgearph.com",
      password: bcrypt.hashSync("admin123", 10),
      firstName: "System",
      lastName: "Administrator",
      role: "admin",
      companyId: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "client-1",
      username: "client",
      email: "client@truckgearph.com",
      password: bcrypt.hashSync("client123", 10),
      firstName: "ABC Hauling",
      lastName: "Corp",
      role: "client",
      companyId: 1,
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "user-jetexpress",
      username: "jetexpress",
      email: "jetexpress@truckgearph.com",
      password: bcrypt.hashSync("password123", 10),
      firstName: "Global",
      lastName: "Jet Express",
      role: "client",
      companyId: 100,
      companyName: "PH GLOBAL JET EXPRESS INC.",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];

  try {
    saveVaultUsers(defaultUsers);
  } catch (_) {}

  return defaultUsers;
}

export function saveVaultUsers(usersList: any[]) {
  const filePath = getUsersVaultPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(usersList, null, 2), "utf-8");
  fs.renameSync(tmp, filePath);
}

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (user) return user;
    } catch (_) {}

    const vaultUsers = getVaultUsers();
    return vaultUsers.find((u) => String(u.id) === String(id));
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const cleanSearch = (username || "").toLowerCase().trim();

    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      if (user) return user;
    } catch (_) {}

    const vaultUsers = getVaultUsers();
    const found = vaultUsers.find((u) => {
      const uName = (u.username || "").toLowerCase().trim();
      const uEmail = (u.email || "").toLowerCase().trim();
      return uName === cleanSearch || uEmail === cleanSearch;
    });

    return found;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const vaultUsers = getVaultUsers();
    const newId = `user-${Date.now()}`;
    const newUser = {
      id: newId,
      username: userData.username,
      password: userData.password,
      firstName: userData.firstName || "",
      lastName: userData.lastName || "",
      role: (userData as any).role || "staff",
      companyId: (userData as any).companyId || 1,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    // Save to Vault
    vaultUsers.push(newUser);
    saveVaultUsers(vaultUsers);

    try {
      await db.insert(users).values(userData as any);
    } catch (e: any) {}

    return newUser as any;
  }
}

export const authStorage = new AuthStorage();
