import { contextBridge, ipcRenderer } from "electron";
import type { AuthStatus } from "../shared/licenseGrant";

contextBridge.exposeInMainWorld("api", {
  dashboard: () => ipcRenderer.invoke("dashboard:get"),
  categories: {
    list: () => ipcRenderer.invoke("categories:list"),
    create: (name: string) => ipcRenderer.invoke("categories:create", name),
  },
  profiles: {
    list: () => ipcRenderer.invoke("profiles:list"),
    get: (id: string) => ipcRenderer.invoke("profiles:get", id),
    save: (profile: unknown) => ipcRenderer.invoke("profiles:save", profile),
    duplicate: (id: string) => ipcRenderer.invoke("profiles:duplicate", id),
    archive: (id: string) => ipcRenderer.invoke("profiles:archive", id),
    restore: (id: string) => ipcRenderer.invoke("profiles:restore", id),
    delete: (id: string) => ipcRenderer.invoke("profiles:delete", id),
  },
  orders: {
    list: () => ipcRenderer.invoke("orders:list"),
    get: (id: string) => ipcRenderer.invoke("orders:get", id),
    save: (order: unknown) => ipcRenderer.invoke("orders:save", order),
    delete: (id: string) => ipcRenderer.invoke("orders:delete", id),
  },
  jobs: {
    list: () => ipcRenderer.invoke("jobs:list"),
    get: (id: string) => ipcRenderer.invoke("jobs:get", id),
    runOrder: (orderId: string) => ipcRenderer.invoke("jobs:runOrder", orderId),
  },
  auth: {
    status: () => ipcRenderer.invoke("auth:status"),
    login: (email: string, password: string) => ipcRenderer.invoke("auth:login", email, password),
    startWebLogin: () => ipcRenderer.invoke("auth:startWebLogin"),
    logout: () => ipcRenderer.invoke("auth:logout"),
    refresh: () => ipcRenderer.invoke("auth:refresh"),
    profile: () => ipcRenderer.invoke("auth:profile"),
    updateProfile: (patch: { displayName?: string }) => ipcRenderer.invoke("auth:updateProfile", patch),
    onChanged: (callback: (status: AuthStatus) => void) => {
      const listener = (_event: unknown, status: AuthStatus) => callback(status);
      ipcRenderer.on("auth:changed", listener);
      return () => {
        ipcRenderer.removeListener("auth:changed", listener);
      };
    },
  },
  billing: {
    plans: () => ipcRenderer.invoke("billing:plans"),
    status: () => ipcRenderer.invoke("billing:status"),
    subscribe: (planId: string) => ipcRenderer.invoke("billing:subscribe", planId),
    changePlan: (planId: string) => ipcRenderer.invoke("billing:changePlan", planId),
    cancel: () => ipcRenderer.invoke("billing:cancel"),
  },
  activity: {
    list: () => ipcRenderer.invoke("activity:list"),
  },
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    update: (patch: unknown) => ipcRenderer.invoke("settings:update", patch),
  },
  dialogs: {
    openFile: (options?: { title?: string; filters?: { name: string; extensions: string[] }[] }) =>
      ipcRenderer.invoke("dialog:openFile", options),
    openFolder: (title?: string) => ipcRenderer.invoke("dialog:openFolder", title),
  },
  workspace: {
    backup: () => ipcRenderer.invoke("workspace:backup"),
    restore: () => ipcRenderer.invoke("workspace:restore"),
  },
  photoshop: {
    detect: () => ipcRenderer.invoke("photoshop:detect"),
  },
  layout: {
    preview: (profile: unknown, sizeId: string) => ipcRenderer.invoke("layout:preview", profile, sizeId),
    open: (profile: unknown, sizeId: string) => ipcRenderer.invoke("layout:open", profile, sizeId),
    capture: (profile: unknown) => ipcRenderer.invoke("layout:capture", profile),
  },
  template: {
    generate: (profile: unknown) => ipcRenderer.invoke("template:generate", profile),
  },
});
