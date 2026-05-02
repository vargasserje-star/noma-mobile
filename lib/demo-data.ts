import { DashboardData } from "@/lib/types";

export const demoDashboard: DashboardData = {
  viewer: { name: "Ana Cristina", role: "OWNER" },
  household: {
    id: "demo-household-1",
    name: "Casa Vargas",
    type: "FAMILY",
    city: "Bogota",
    activeMembers: 4,
    ownerName: "Ana Cristina",
    dateLabel: "Lunes, 31 de marzo · 2026",
    score: 82
  },
  metrics: {
    openTasks: 7,
    monthlySpend: 3024000,
    completionRate: 81,
    upcomingMeals: 5,
    todayCompleted: 9,
    todayTotal: 11,
    budgetUsed: 72
  },
  members: [
    { id: "m1", name: "Ana Cristina", role: "Administradora principal", roleKey: "OWNER", load: "Coordina semana y gastos", initials: "AC", color: "moss" },
    { id: "m2", name: "Carlos", role: "Miembro del hogar", roleKey: "MEMBER", load: "Pagos, transporte y pendientes del hogar", initials: "CA", color: "gold" },
    { id: "m3", name: "Maria", role: "Empleada domestica", roleKey: "DOMESTIC_HELP", load: "Rutina diaria y evidencias", initials: "MA", color: "terra" },
    { id: "m4", name: "Lucia", role: "Miembro del hogar", roleKey: "MEMBER", load: "Cuarto y uniforme", initials: "LU", color: "sky" }
  ],
  tasks: [
    {
      id: "t1",
      title: "Barrer y trapear sala",
      status: "DONE",
      assignedTo: "Maria",
      dueDate: "Completado 9:02am",
      dueAt: "2026-03-31T09:02:00.000Z",
      hasPhoto: true,
      frequency: "WEEKLY",
      priority: "MEDIUM"
    },
    {
      id: "t2",
      title: "Limpiar banos",
      status: "DONE",
      assignedTo: "Maria",
      dueDate: "Completado 10:35am",
      dueAt: "2026-03-31T10:35:00.000Z",
      hasPhoto: true,
      frequency: "WEEKLY",
      priority: "MEDIUM"
    },
    {
      id: "t3",
      title: "Cocina profunda",
      status: "IN_PROGRESS",
      assignedTo: "Maria",
      dueDate: "Pendiente hoy",
      dueAt: "2026-03-31T16:00:00.000Z",
      requiresPhoto: true,
      frequency: "WEEKLY",
      priority: "HIGH"
    },
    {
      id: "t4",
      title: "Pagar administracion",
      status: "TODO",
      assignedTo: "Carlos",
      dueDate: "Vence hoy",
      dueAt: "2026-03-31T17:00:00.000Z",
      notes: "$320K",
      frequency: "MONTHLY",
      priority: "HIGH"
    },
    {
      id: "t5",
      title: "Mercado semanal",
      status: "TODO",
      assignedTo: "Ana Cristina",
      dueDate: "27 productos",
      dueAt: "2026-04-02T18:00:00.000Z",
      frequency: "WEEKLY",
      priority: "MEDIUM"
    },
    {
      id: "t6",
      title: "Revisar uniforme de Lucia",
      status: "TODO",
      assignedTo: "Lucia",
      dueDate: "Manana temprano",
      dueAt: "2026-04-01T07:00:00.000Z",
      frequency: "DAILY",
      priority: "LOW"
    },
    {
      id: "t7",
      title: "Sacar basura reciclaje",
      status: "TODO",
      assignedTo: "Carlos",
      dueDate: "Jueves",
      dueAt: "2026-04-03T19:00:00.000Z",
      frequency: "WEEKLY",
      priority: "LOW"
    }
  ],
  expenses: [
    { id: "e1", title: "Nomina Maria", amount: 1260000, category: "Empleada", spentAt: "2026-04-01" },
    { id: "e2", title: "Mercado semanal", amount: 847000, category: "Mercado", spentAt: "2026-03-30" },
    { id: "e3", title: "Administracion", amount: 420000, category: "Administracion", spentAt: "2026-03-29" },
    { id: "e4", title: "Servicios", amount: 310000, category: "Servicios", spentAt: "2026-03-27" }
  ],
  meals: [
    { id: "meal1", day: "Lunes", type: "Almuerzo", title: "Arroz con pollo" },
    { id: "meal2", day: "Lunes", type: "Cena", title: "Sopa de verduras" },
    { id: "meal3", day: "Martes", type: "Almuerzo", title: "Pasta bolonesa" },
    { id: "meal4", day: "Martes", type: "Cena", title: "Ensalada cesar" },
    { id: "meal5", day: "Miercoles", type: "Almuerzo", title: "Pescado al horno" }
  ],
  shopping: [
    { id: "s1", title: "Pechuga de pollo", quantity: "1kg", checked: false },
    { id: "s2", title: "Tomates cherry", quantity: "1 bandeja", checked: false },
    { id: "s3", title: "Lechuga romana", quantity: "2 und", checked: true },
    { id: "s4", title: "Papel higienico", quantity: "12 und", checked: false },
    { id: "s5", title: "Detergente", quantity: "1 bolsa", checked: false }
  ],
  alerts: [
    {
      id: "a1",
      title: "Pago de administracion vence hoy",
      detail: "$320.000 · Asignado a Carlos",
      tone: "warning",
      action: "Ver pago"
    },
    {
      id: "a2",
      title: "Maria completo 3 tareas con foto",
      detail: "Sala, banos y sabanas · hace 40 min",
      tone: "success",
      action: "Ver fotos"
    },
    {
      id: "a3",
      title: "Netflix vence en 3 dias",
      detail: "Renovacion automatica programada el 3 abr",
      tone: "info",
      action: "Gestionar"
    }
  ],
  calendar: [
    { id: "c1", dayLabel: "Lun", dateLabel: "31", items: ["Maria", "Admin"], isToday: true, isoDate: "2026-03-31" },
    { id: "c2", dayLabel: "Mar", dateLabel: "1", items: ["Dentista"], isoDate: "2026-04-01" },
    { id: "c3", dayLabel: "Mie", dateLabel: "2", items: ["Maria", "Mercado"], isoDate: "2026-04-02" },
    { id: "c4", dayLabel: "Jue", dateLabel: "3", items: ["Agua"], isoDate: "2026-04-03" },
    { id: "c5", dayLabel: "Vie", dateLabel: "4", items: ["Maria"], isoDate: "2026-04-04" }
  ],
  employee: {
    name: "Maria Rodriguez",
    role: "Empleada domestica",
    schedule: "Lunes, Miercoles, Viernes",
    compliance: 94,
    activeDays: 12,
    todayProgress: "3/4",
    clockIn: "8:14am",
    shiftProgress: "Lleva 4h 12min · Jornada estimada: 8 horas",
    tasks: [
      {
        id: "et1",
        title: "Barrer y trapear: sala, comedor y pasillos",
        instructions: "Usar el trapeador de microfibra gris. Empezar por el corredor principal hacia la sala.",
        status: "DONE",
        completedAt: "9:02am",
        photoStatus: "Foto enviada"
      },
      {
        id: "et2",
        title: "Limpiar banos (principal + ninos)",
        instructions: "Desinfectante azul para sanitarios. Revisar que haya papel higienico.",
        status: "DONE",
        completedAt: "10:35am",
        photoStatus: "Foto enviada"
      },
      {
        id: "et3",
        title: "Cambiar sabanas cuarto principal",
        instructions: "Sabanas limpias en el closet color crema, segundo cajon.",
        status: "DONE",
        photoStatus: "Sin foto aun"
      },
      {
        id: "et4",
        title: "Limpieza profunda de cocina",
        instructions: "Limpiar estufa, campana, nevera por fuera y desengrasar superficies.",
        status: "TODO",
        photoStatus: "Adjuntar foto cuando termines"
      }
    ]
  },
  finances: {
    monthLabel: "Marzo 2026",
    budgetTotal: 4200000,
    budgetUsed: 3024000,
    fixedCosts: 1980000,
    variableCosts: 1044000,
    subscriptionsTotal: 187000,
    categories: [
      { id: "fc1", name: "Empleada", icon: "🧹", amount: 1260000, share: 42, color: "terra" },
      { id: "fc2", name: "Mercado", icon: "🛒", amount: 847000, share: 28, color: "gold" },
      { id: "fc3", name: "Administracion", icon: "🏢", amount: 420000, share: 16, color: "sky" },
      { id: "fc4", name: "Servicios", icon: "💡", amount: 310000, share: 10, color: "ink" },
      { id: "fc5", name: "Suscripciones", icon: "📺", amount: 187000, share: 4, color: "moss" }
    ],
    subscriptions: [
      { id: "sub1", name: "Netflix", amount: 52000, renewsIn: "Vence en 3 dias · 3 abr", status: "warning" },
      { id: "sub2", name: "Spotify Family", amount: 38000, renewsIn: "Vence 15 abr", status: "ok" },
      { id: "sub3", name: "iCloud+ 200GB", amount: 15000, renewsIn: "Vence 22 abr", status: "ok" },
      { id: "sub4", name: "Amazon Prime", amount: 25000, renewsIn: "Vence 28 abr", status: "ok" }
    ],
    savingsGoals: [
      {
        id: "sg1",
        name: "Vacaciones en familia",
        target: 4800000,
        current: 1960000,
        owners: ["Ana Cristina", "Carlos"],
        deadline: "Dic 2026"
      },
      {
        id: "sg2",
        name: "Fondo de emergencia",
        target: 3000000,
        current: 1440000,
        owners: ["Hogar"],
        deadline: "Sep 2026"
      }
    ],
    allowances: [
      {
        id: "al1",
        childName: "Lucia",
        weeklyAmount: 30000,
        saved: 148000,
        available: 22000,
        streak: "8 semanas ahorrando"
      }
    ],
    bills: [
      {
        id: "b1",
        name: "Administracion",
        amount: 420000,
        dueLabel: "Vence hoy",
        status: "warning"
      },
      {
        id: "b2",
        name: "Energia",
        amount: 180000,
        dueLabel: "Vence 4 abr",
        status: "ok"
      },
      {
        id: "b3",
        name: "Agua",
        amount: 96000,
        dueLabel: "Vence 8 abr",
        status: "ok"
      }
    ],
    fixedExpenses: [
      {
        id: "fx1",
        name: "Nómina empleada",
        amount: 1260000,
        cadence: "Mensual",
        nextCharge: "1 de cada mes"
      },
      {
        id: "fx2",
        name: "Internet hogar",
        amount: 129900,
        cadence: "Mensual",
        nextCharge: "12 abr"
      },
      {
        id: "fx3",
        name: "Netflix",
        amount: 52000,
        cadence: "Mensual",
        nextCharge: "3 abr"
      },
      {
        id: "fx4",
        name: "Spotify Family",
        amount: 38000,
        cadence: "Mensual",
        nextCharge: "15 abr"
      },
      {
        id: "fx5",
        name: "iCloud+ 200GB",
        amount: 15000,
        cadence: "Mensual",
        nextCharge: "22 abr"
      },
      {
        id: "fx6",
        name: "Amazon Prime",
        amount: 25000,
        cadence: "Mensual",
        nextCharge: "28 abr"
      }
    ]
  }
};
