export const householdTypeOptions = ["FAMILY", "COUPLE", "SINGLE_PARENT", "ROOMMATES"] as const;
export type HouseholdTypeKey = (typeof householdTypeOptions)[number];

export const roleOptions = ["OWNER", "MEMBER", "DOMESTIC_HELP"] as const;
export type AppRoleKey = (typeof roleOptions)[number];

export const permissionKeys = [
  "viewHomeDashboard",
  "manageMembers",
  "assignTasks",
  "updateOwnTasks",
  "viewFullFinances",
  "manageFinances",
  "viewSubscriptions",
  "viewEmployeeModule",
  "manageMenus",
  "viewPersonalSavings",
  "submitEvidence",
  "manageInvitations",
  "transferOwnership",
  "deleteHousehold"
] as const;

export type PermissionKey = (typeof permissionKeys)[number];
export type DashboardNavId = "home" | "tasks" | "finances" | "subscriptions" | "employee" | "menus" | "profile" | "savings" | "evidence";

export const householdTypeMeta: Record<HouseholdTypeKey, { label: string; description: string }> = {
  FAMILY: {
    label: "Familia",
    description: "Hogar familiar con visibilidad completa, ahorro, hijos y operacion diaria."
  },
  COUPLE: {
    label: "Pareja",
    description: "Dos administradores compartiendo tareas, finanzas y decisiones del hogar."
  },
  SINGLE_PARENT: {
    label: "Madre o padre con hijos",
    description: "Administracion centralizada con apoyo en tareas, finanzas y seguimiento a hijos."
  },
  ROOMMATES: {
    label: "Roommates",
    description: "Casa compartida con foco en tareas comunes, servicios, gastos divididos y convivencia."
  }
};

export const roleMeta: Record<AppRoleKey, { label: string; description: string; entryView: string }> = {
  OWNER: {
    label: "Propietario",
    description: "Control total del hogar — miembros, finanzas, empleada y configuracion.",
    entryView: "Dashboard completo del hogar"
  },
  MEMBER: {
    label: "Miembro del hogar",
    description: "Acceso a tareas, menus y mercado. Finanzas segun permiso del propietario.",
    entryView: "Dashboard del hogar"
  },
  DOMESTIC_HELP: {
    label: "Empleada del hogar",
    description: "Ve sus tareas del dia y ficha entrada y salida.",
    entryView: "Mi jornada"
  }
};

export const rolePermissions: Record<AppRoleKey, PermissionKey[]> = {
  OWNER: [...permissionKeys],
  MEMBER: [
    "viewHomeDashboard",
    "assignTasks",
    "updateOwnTasks",
    "manageMenus",
    "viewPersonalSavings"
    // viewFullFinances / manageFinances / viewSubscriptions are granted via canViewFinances override
  ],
  DOMESTIC_HELP: [
    "updateOwnTasks",
    "submitEvidence"
  ]
};

export function getRoleLabel(role: AppRoleKey) {
  return roleMeta[role]?.label ?? role;
}

export function getHouseholdTypeLabel(type: HouseholdTypeKey) {
  return householdTypeMeta[type].label;
}

export function hasPermission(
  role: AppRoleKey,
  permission: PermissionKey,
  overrides?: Partial<Record<PermissionKey, boolean>>
) {
  if (typeof overrides?.[permission] === "boolean") {
    return overrides[permission] as boolean;
  }
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function getTopTabsForRole(
  role: AppRoleKey,
  _householdType: HouseholdTypeKey,
  canViewFinances = false
): DashboardNavId[] {
  if (role === "DOMESTIC_HELP") return [];
  if (role === "MEMBER") {
    const tabs: DashboardNavId[] = ["home", "tasks"];
    if (canViewFinances) tabs.push("finances");
    tabs.push("menus");
    return tabs;
  }
  // OWNER
  return ["home", "tasks", "finances", "employee", "menus"];
}

export function getInviteFlow(role: AppRoleKey) {
  if (role === "DOMESTIC_HELP") {
    return "Codigo de vinculacion generado por el propietario — la empleada lo ingresa al instalar Noma.";
  }
  return "Invitacion por link o codigo de 6 caracteres con rol preasignado.";
}

export function getSidebarItemsForRole(role: AppRoleKey, householdType: HouseholdTypeKey): DashboardNavId[] {
  if (role === "DOMESTIC_HELP") return [];
  if (role === "MEMBER") return ["home", "tasks", "menus", "profile"];
  return ["home", "tasks", "finances", "subscriptions", "employee", "menus", "profile"];
}
