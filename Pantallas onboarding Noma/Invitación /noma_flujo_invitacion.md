# Noma — Flujo de Invitación de Miembros
**Versión:** 1.0 · Abril 2026  
**Estado:** Aprobado para desarrollo  
**Para:** Equipo de desarrollo + Tiba  
**Contexto:** Este flujo aparece al final del onboarding del OWNER, después de crear el hogar. También está disponible desde Configuración en cualquier momento.

---

## Resumen del flujo

```
P9 — Crear el hogar
      ↓
P10 — ¿Quieres invitar a alguien ahora?
      ↙                    ↘
Invitar personas      Ahora no, entrar a mi hogar
      ↓                         ↓
P10B — ¿A quién vas        Dashboard
       a invitar?
      ↙           ↘
Miembro         Empleada
del hogar       doméstica
   ↓                ↓
Toggle de       Sin toggle
finanzas        directo a
aparece         código
   ↓                ↓
P10C — Código listo
      ↙        ↓          ↘
Compartir   Invitar a    Listo, entrar
WhatsApp    otra persona  a mi hogar
                ↓
             Vuelve a P10B
```

---

## P9 — Ponle nombre a tu hogar

**Quién la ve:** Solo OWNER  
**Cuándo aparece:** Justo después de la promesa final del onboarding  
**Función:** El OWNER le da nombre al hogar. Así lo verán todos los miembros cuando se unan.

| Elemento | Contenido |
|---|---|
| Headline | "Ponle nombre a tu hogar" |
| Subcopy | "Así lo van a ver todos los miembros cuando se unan." |
| Input placeholder | Ej: Casa Martínez, Nuestro hogar, El aparta... |
| Botón | `Crear mi hogar` |

**Nota para desarrollo:**  
El botón `Crear mi hogar` debe estar desactivado hasta que el usuario escriba al menos un carácter en el input.

---

## P10 — ¿Quieres invitar a alguien ahora?

**Quién la ve:** Solo OWNER  
**Cuándo aparece:** Inmediatamente después de crear el hogar  
**Función:** El OWNER decide si invita personas ahora o lo hace después desde configuración.

| Elemento | Contenido |
|---|---|
| Headline | "¿Quieres invitar a alguien ahora?" |
| Subcopy | "Puedes invitar a las personas que viven contigo o te ayudan en casa. También puedes hacerlo después desde configuración." |
| Botón principal | `👤+ Invitar personas` |
| Botón secundario | `Ahora no, entrar a mi hogar` |

**Comportamiento de los botones:**
- `Invitar personas` → lleva a P10B
- `Ahora no, entrar a mi hogar` → entra al dashboard directamente

**Nota para desarrollo:**  
El botón secundario no tiene color de fondo — es un botón con borde o simplemente texto con estilo de botón. No debe competir visualmente con el botón principal naranja.

---

## P10B — ¿A quién vas a invitar?

**Quién la ve:** Solo OWNER  
**Cuándo aparece:** Al tocar "Invitar personas" en P10 o "Invitar a otra persona" en P10C  
**Función:** El OWNER elige el rol de la persona que va a invitar. Si elige Miembro, aparece el toggle de finanzas. Si elige Empleada doméstica, no aparece el toggle.

### Estado inicial — ninguna opción seleccionada

| Elemento | Contenido |
|---|---|
| Headline | "¿A quién vas a invitar?" |
| Card 1 | 👤 Miembro del hogar → |
| Card 2 | 🧹 Empleada doméstica → |
| Botón | `Generar código` *(desactivado hasta seleccionar)* |

---

### Estado A — Miembro del hogar seleccionado

Cuando el OWNER toca la card de **Miembro del hogar**, la card queda marcada con un check verde y aparece el toggle de finanzas debajo de las cards.

| Elemento | Contenido |
|---|---|
| Card 1 | 👤 Miembro del hogar ✓ *(seleccionada, borde verde)* |
| Card 2 | 🧹 Empleada doméstica *(no seleccionada)* |
| Toggle | "¿Puede ver las finanzas del hogar?" |
| Opciones toggle | `Sí` / `No` |
| Default toggle | **No** *(siempre por defecto)* |
| Texto aclaratorio | "Por defecto, esta persona no podrá ver las finanzas del hogar." |
| Botón | `Generar código` *(activo, naranja)* |

**Lógica del toggle:**
- Por defecto siempre está en **No**
- El OWNER lo activa manualmente si quiere darle acceso a finanzas
- Esta configuración queda guardada en el perfil del miembro y puede cambiarse después desde Configuración
- El toggle **solo aparece cuando Miembro del hogar está seleccionado** — desaparece si el OWNER cambia a Empleada doméstica

---

### Estado B — Empleada doméstica seleccionada

Cuando el OWNER toca la card de **Empleada doméstica**, la card queda marcada y el toggle de finanzas **no aparece** porque la empleada nunca tiene acceso a finanzas.

| Elemento | Contenido |
|---|---|
| Card 1 | 👤 Miembro del hogar *(no seleccionada)* |
| Card 2 | 🧹 Empleada doméstica ✓ *(seleccionada, borde verde)* |
| Toggle | No aparece |
| Botón | `Generar código` *(activo, naranja)* |

---

## P10C — Código listo

**Quién la ve:** Solo OWNER  
**Cuándo aparece:** Al tocar `Generar código` en P10B  
**Función:** Muestra el código generado para que el OWNER lo comparta con la persona invitada.

| Elemento | Contenido |
|---|---|
| Headline | "Código listo" |
| Subcopy arriba del código | "Tu código de invitación" |
| Código | `A3K9P2` *(grande, en caja con borde punteado)* |
| Botón copiar | `📋 Copiar` *(dentro de la caja, esquina inferior derecha)* |
| Subcopy debajo del código | "Compártelo con la persona que quieres invitar. Tiene 48 horas para usarlo." |
| Botón 1 | `🟢 Compartir por WhatsApp` *(verde WhatsApp)* |
| Botón 2 | `👤+ Invitar a otra persona` *(borde, sin fondo)* |
| Botón 3 | `Listo, entrar a mi hogar` *(borde, sin fondo)* |

**Comportamiento de los botones:**

`Compartir por WhatsApp`  
Abre WhatsApp directamente con un mensaje prellenado:  
*"Te invito a unirte a nuestro hogar en Noma. Descarga la app y usa el código: A3K9P2. Tienes 48 horas para usarlo."*

`Invitar a otra persona`  
Vuelve a P10B con las cards en estado inicial — sin selección, sin toggle visible. Permite generar un nuevo código con un rol diferente.

`Listo, entrar a mi hogar`  
Entra al dashboard directamente.

---

## Comportamiento del código

| Detalle | Valor |
|---|---|
| Longitud | 6 caracteres |
| Formato | Letras mayúsculas y números. Sin caracteres confusos como 0/O o 1/I |
| Vigencia | 48 horas desde que se genera |
| Uso | Un solo uso — una vez que alguien lo usa, expira automáticamente |
| Si expira | El OWNER puede generar un nuevo código desde Configuración |
| Rol codificado | El código lleva el rol y el permiso de finanzas ya configurados. Cuando el invitado lo ingresa, Noma sabe automáticamente si es MEMBER o DOMESTIC_HELP y si puede ver finanzas o no |

---

## Acceso desde Configuración

Todo este flujo desde P10B y P10C también está disponible dentro del dashboard en **Configuración → Miembros del hogar → Invitar persona.**

El OWNER puede invitar nuevas personas en cualquier momento, no solo durante el onboarding.

---

## Notas para desarrollo

1. **El toggle de finanzas** solo es visible cuando la card de Miembro del hogar está seleccionada. Si el OWNER cambia a Empleada doméstica, el toggle desaparece sin animación brusca.

2. **El default del toggle siempre es No.** El OWNER tiene que activarlo conscientemente. Esto protege la privacidad financiera por defecto.

3. **Cada código es único e irrepetible.** El sistema genera un código nuevo cada vez. Si el OWNER genera dos códigos seguidos, ambos son válidos por 48 horas salvo que el primero ya haya sido usado.

4. **El mensaje de WhatsApp es prellenado** pero el OWNER puede editarlo antes de enviarlo. No es un envío automático — abre WhatsApp con el texto ya escrito para que el OWNER lo mande a quien quiera.

5. **El botón `Copiar`** copia solo el código (6 caracteres) al portapapeles, no el mensaje completo.

---

*Noma · Flujo de Invitación v1.0 · Abril 2026*
