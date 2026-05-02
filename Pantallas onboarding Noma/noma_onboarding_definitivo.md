# Noma — Onboarding Definitivo
**Versión:** 1.0 · Abril 2026  
**Estado:** Aprobado para diseño  
**Para:** Tiba (Diseño)  
**Idioma:** Español tuteo  

---

## Arquitectura general

El onboarding tiene un solo punto de entrada y se bifurca en la Pantalla 2. Hay tres flujos independientes según el rol del usuario.

```
Abre la app
      ↓
¿Tiene sesión activa?
   ↙          ↘
  Sí            No
   ↓             ↓
Dashboard    P0 — Login / Crear cuenta
                  ↓
             P1 — Bienvenida (todos)
                  ↓
             P2 — Bifurcación de rol (todos)
              ↙        ↓        ↘
          OWNER     MEMBER    DOMESTIC HELP
         8 pant.    6 pant.     5 pant.
```

**Regla de oro del onboarding:**  
Cada pregunta existe porque su respuesta produce un cambio visible en el producto. No hay preguntas para uso interno ni para segmentación de datos.

---

## Pantalla 0 — Login / Crear cuenta
**Quién la ve:** Todos  
**Función:** Primera pantalla que ve cualquier usuario. Unifica login y registro en una sola acción.

| Elemento | Contenido |
|---|---|
| Logo | Noma centrado arriba |
| Headline | "Empieza a organizar tu hogar" |
| Subcopy | "Crea tu cuenta o inicia sesión en segundos." |
| Botón 1 | `Continuar con Google` |
| Botón 2 | `Continuar con Apple` |
| Link pequeño | `Usar correo electrónico` |

**Lógica técnica:**
- Si el correo **no existe** en la base de datos → crea la cuenta automáticamente y arranca el onboarding desde P1
- Si el correo **ya existe** → inicia sesión y va directo al dashboard. El onboarding no se repite nunca.

**Nota para Tiba:**  
Los botones de Google y Apple tienen diseño estándar definido por cada empresa. Seguir las guidelines exactas de Google y Apple o las tiendas pueden rechazar la app. Orden siempre: primero Google, luego Apple. En Android el botón de Apple puede omitirse.

---

## Pantalla 1 — Bienvenida
**Quién la ve:** Todos los flujos  
**Función:** Primera impresión. Promesa central del producto.

| Elemento | Contenido |
|---|---|
| Headline | "El hogar no debería depender de una sola persona." |
| Subcopy | "Noma distribuye la carga, coordina a todos y hace que tu casa funcione aunque tú no estés pensando en ella." |
| Botón | `Empezar` |

**Nota para Tiba:**  
Fondo beige. Logo centrado arriba. Ilustración 3D en el centro. Solo texto y botón abajo.

---

## Pantalla 2 — Bifurcación de rol
**Quién la ve:** Todos los flujos  
**Función:** Define el camino de cada usuario. La pantalla más crítica del flujo completo.

| Elemento | Contenido |
|---|---|
| Headline | "¿Cómo vas a usar Noma?" |
| Card 1 | 🏠 Voy a crear y administrar mi hogar |
| Card 2 | 👤 Me invitaron a unirme a un hogar |
| Card 3 | 🧹 Soy empleada doméstica |

**Nota para Tiba:**  
Las cards deben ser clarísimas. Si el usuario se equivoca de rol, toda su experiencia queda mal. Agregar texto pequeño debajo: *"¿Te equivocaste? Puedes volver atrás."*

---

---

# FLUJO 1 — OWNER
**Total:** 8 pantallas  
**Descripción:** El que crea el hogar desde cero. Es el único que paga la suscripción.

**Recorrido:**  
`P1 Bienvenida → P2 Bifurcación → P3 Reconocimiento → P4 Perfil hogar → P5 Confirmación → P6 Nombre → P7 Prueba 30 días → P8 Promesa final`

---

### P3 — El reconocimiento ⭐
**Solo:** OWNER  
**Función:** Momento de identidad. La pantalla más importante emocionalmente de todo el onboarding.

| Elemento | Contenido |
|---|---|
| Headline | "Si llegaste aquí, probablemente llevas tiempo cargando con todo." |
| Subcopy | "Las compras, las tareas, los pagos, las instrucciones que nadie más recuerda. Lo haces en silencio, funciona porque tú lo sostienes, y casi nadie lo ve.<br><br>Eso termina hoy." |
| Botón | `Así es, quiero que cambie` |

**Nota para Tiba:**  
Solo texto grande. Sin imágenes ni decoración. Mucho espacio en blanco. La emoción la genera el copy, no el diseño.

---

### P4 — Perfil del hogar
**Solo:** OWNER  
**Función:** Ramificación. La respuesta personaliza el copy de la pantalla siguiente.

| Elemento | Contenido |
|---|---|
| Headline | "¿Cómo es tu hogar?" |
| Card 1 | 🏠 Familia con hijos |
| Card 2 | 👫 Pareja sin hijos |
| Card 3 | 🤝 Roommates |
| Card 4 | 🧍 Vivo solo/a |
| Segunda pregunta | "¿Tienes empleada doméstica o personal de apoyo en casa?" |
| Opciones segunda pregunta | `Sí` / `No` |
| Botón | `Continuar` |

**Nota para Tiba:**  
La segunda pregunta aparece suavemente al seleccionar el tipo de hogar.

---

### P5 — Confirmación personalizada
**Solo:** OWNER  
**Función:** Copy varía según el perfil elegido. El usuario siente que Noma lo conoce.

**Headline (igual para todos):**  
> "Perfecto. Noma está hecho para hogares como el tuyo."

---

**Variante A — Familia con hijos + con empleada:**
> "En casas con familia e hijos, una sola persona termina siendo el sistema operativo de todo. Noma va a cambiar eso: cada persona sabrá qué le toca, tú verás todo desde un solo lugar, y tu empleada tendrá instrucciones claras sin que tengas que repetirlas cada semana."

---

**Variante B — Familia con hijos + sin empleada:**
> "En casas con familia e hijos, una sola persona termina siendo el sistema operativo de todo. Noma va a cambiar eso: cada miembro del hogar va a saber qué le toca, los gastos van a tener orden y tú vas a poder ver cómo está tu casa sin tener que perseguir a nadie."

---

**Variante C — Pareja sin hijos + con empleada:**
> "En hogares de pareja, los conflictos no son por falta de amor. Son por falta de sistema. Noma les va a dar claridad sobre quién hace qué y tu empleada tendrá instrucciones claras sin que tengas que repetirlas cada semana."

---

**Variante D — Pareja sin hijos + sin empleada:**
> "En hogares de pareja, los conflictos no son por falta de amor. Son por falta de sistema. Noma les va a dar claridad sobre quién hace qué, cómo van los gastos y qué hay pendiente, sin que ninguno tenga que cargar con todo solo."

---

**Variante E — Roommates:**
> "Vivir con roommates funciona bien cuando hay claridad. El problema no es la convivencia, es que nadie sabe exactamente qué le toca, los gastos compartidos se vuelven incómodos y siempre termina siendo el mismo el que carga con todo. Noma le da a cada persona sus responsabilidades claras y los gastos visibles para todos."

---

**Variante F — Vivo solo/a + sin empleada:**
> "Vivir solo no significa que el hogar se gestione solo. Los pagos, las compras, las tareas recurrentes — todo depende de ti y de tu memoria. Noma te da un sistema para que nada se te escape y tu cabeza pueda descansar de cargar con la operación de tu propia casa."

---

**Variante G — Vivo solo/a + con empleada:**
> "Tener empleada doméstica debería darte tranquilidad, no más cosas de las que estar pendiente. Noma le da a tu empleada sus tareas del día con instrucciones claras, y a ti una vista en tiempo real de que todo está funcionando aunque no estés en casa."

---

**Botón (igual para todos):** `Me interesa, seguir`

**Nota para Tiba:**  
Solo mostrar el subcopy correspondiente al perfil seleccionado en P4. El headline es siempre el mismo.

---

### P6 — El nombre
**Solo:** OWNER  
**Función:** Personalización. Se usa en la promesa final y en todo el producto.

| Elemento | Contenido |
|---|---|
| Headline | "¿Cómo te llamas?" |
| Subcopy | "Así sabemos cómo hablarte." |
| Input | Tu nombre |
| Botón | `Continuar` |

**Nota para Tiba:**  
Pantalla minimalista. Solo el campo y el botón.

---

### P7 — Prueba 30 días
**Solo:** OWNER  
**Función:** Única mención del modelo de pago en todo el onboarding. Transparente, sin presión.

| Elemento | Contenido |
|---|---|
| Headline | "Tienes 30 días para probar todo Noma sin límites." |
| Subcopy | "Módulo de empleada, finanzas completas, miembros ilimitados. Todo activo desde hoy. Sin tarjeta de crédito." |
| Texto pequeño | "Al finalizar los 30 días puedes continuar gratis con funciones básicas o activar Noma Hogar por $20.000 COP al mes." |
| Botón | `Empezar mi prueba gratis` |

**Nota para Tiba:**  
Sin formulario de pago. Sin campo de tarjeta. Solo información clara sobre qué tiene y qué pasa después.

---

### P8 — Promesa final
**Solo:** OWNER  
**Función:** Cierre emocional. Nombre dinámico. Entrada al dashboard.

| Elemento | Contenido |
|---|---|
| Headline | "[Nombre], bienvenida a Noma." |
| Subcopy | "A partir de hoy, tu hogar tiene un sistema. Las tareas van a estar asignadas. Los gastos van a tener orden. Y tú vas a poder ver cómo está tu casa sin tener que preguntar, recordar ni perseguir a nadie.<br><br>Lo que antes dependía de ti sola, ahora lo sostiene el sistema." |
| Botón | `Crear mi hogar` |

**Destino:** Dashboard de configuración inicial del hogar.

**Nota para Tiba:**  
Esta pantalla debe sentirse como una llegada, no como otro paso. El botón dice "Crear mi hogar" — no "Continuar" ni "Siguiente". Eso importa.

---

---

# FLUJO 2 — MEMBER
**Total:** 6 pantallas  
**Descripción:** Alguien que recibió una invitación del OWNER. No paga nada.

**Recorrido:**  
`P1 Bienvenida → P2 Bifurcación → P3 Código → P4 Confirmación hogar → P5 Nombre → P6 Promesa final`

---

### P3 — Ingreso de código
**Solo:** MEMBER  
**Función:** El OWNER ya generó el código. El MEMBER lo ingresa aquí.

| Elemento | Contenido |
|---|---|
| Headline | "Ingresa el código que te compartieron" |
| Subcopy | "La persona que administra tu hogar generó un código de 6 caracteres. Escríbelo aquí para unirte." |
| Input | Código de 6 caracteres |
| Botón | `Verificar código` |

**Nota para Tiba:**  
Si el código no existe, mostrar error amable: *"Ese código no funciona. Pídele uno nuevo a tu administrador."*

---

### P4 — Confirmación de hogar
**Solo:** MEMBER  
**Función:** El sistema encontró el hogar. El usuario confirma que es el correcto.

| Elemento | Contenido |
|---|---|
| Headline | "¡Encontramos tu hogar!" |
| Subcopy | "Vas a unirte al hogar de **[Nombre del hogar]** como miembro. Desde aquí vas a ver tus tareas, el menú de la semana y lo que hay pendiente en casa." |
| Botón | `Unirme` |

**Nota para Tiba:**  
Mostrar el nombre del hogar en grande para que el usuario confirme visualmente que es el correcto.

---

### P5 — El nombre
**Solo:** MEMBER  
**Función:** Así lo van a ver los demás miembros del hogar.

| Elemento | Contenido |
|---|---|
| Headline | "¿Cómo te llamas?" |
| Subcopy | "Así te van a ver los demás en el hogar." |
| Input | Tu nombre |
| Botón | `Continuar` |

---

### P6 — Promesa final
**Solo:** MEMBER  
**Función:** Cierre simple. Entra directo al dashboard de miembro.

| Elemento | Contenido |
|---|---|
| Headline | "[Nombre], ya eres parte del hogar." |
| Subcopy | "Ya puedes ver tus tareas, el menú de la semana y todo lo que está pasando en casa. Tu parte es simple: saber qué te toca y hacerlo." |
| Botón | `Ver mi hogar` |

**Destino:** Dashboard de MEMBER directamente.

---

---

# FLUJO 3 — DOMESTIC HELP
**Total:** 5 pantallas  
**Descripción:** La empleada doméstica. Flujo más simple de los tres. Diseñado para cualquier nivel tecnológico.

**Principio de diseño:**  
Menos texto, instrucciones más directas, cero fricción. Sin promesa emocional al final — solo claridad operativa.

**Recorrido:**  
`P1 Bienvenida → P2 Bifurcación → P3 Código → P4 Confirmación → P5 Nombre + Entrada`

---

### P3 — Ingreso de código
**Solo:** DOMESTIC HELP  
**Función:** Copy más simple que el del MEMBER. Sin tecnicismos.

| Elemento | Contenido |
|---|---|
| Headline | "Ingresa el código que te dieron" |
| Subcopy | "La persona que te contrató te compartió un código para que puedas entrar. Escríbelo aquí." |
| Input | Tu código |
| Botón | `Entrar` |

**Nota para Tiba:**  
No usar la palabra "administrador". Copy directo y simple.

---

### P4 — Confirmación
**Solo:** DOMESTIC HELP  
**Función:** Confirma el hogar y explica en qué consiste su experiencia en la app.

| Elemento | Contenido |
|---|---|
| Headline | "¡Listo! Ya encontramos tu hogar." |
| Subcopy | "Aquí vas a ver tus tareas del día, marcar las que vas completando y registrar tu entrada y salida. Simple y claro." |
| Botón | `Ver mis tareas` |

---

### P5 — Nombre + Entrada directa
**Solo:** DOMESTIC HELP  
**Función:** Último paso. Entra directo a su vista de tareas.

| Elemento | Contenido |
|---|---|
| Headline | "¿Cómo te llamas?" |
| Subcopy | "Para que sepan quién completó cada tarea." |
| Input | Tu nombre |
| Botón | `Entrar a mis tareas` |

**Destino:** Vista exclusiva de DOMESTIC HELP. Stack separado del dashboard principal.

---

---

# Resumen de los tres flujos

| Pantalla | OWNER | MEMBER | DOMESTIC HELP |
|---|:---:|:---:|:---:|
| P0 — Login / Crear cuenta | ✓ Compartida | ✓ Compartida | ✓ Compartida |
| P1 — Bienvenida | ✓ Compartida | ✓ Compartida | ✓ Compartida |
| P2 — Bifurcación de rol | ✓ Compartida | ✓ Compartida | ✓ Compartida |
| P3 — Reconocimiento emocional | ✓ Exclusiva | — | — |
| P3 — Ingreso de código | — | ✓ Exclusiva | ✓ Exclusiva |
| P4 — Perfil del hogar | ✓ Exclusiva | — | — |
| P4 — Confirmación de hogar | — | ✓ Exclusiva | ✓ Exclusiva |
| P5 — Confirmación personalizada | ✓ 7 variantes | — | — |
| P5/6 — Nombre | ✓ | ✓ | ✓ |
| P7 — Prueba 30 días | ✓ Exclusiva | — | — |
| P8/6/5 — Promesa / Entrada | ✓ Emocional | ✓ Simple | ✓ Operativa |
| **Total pantallas** | **8** | **6** | **5** |

---

# Notas críticas para Tiba

1. **P3 del OWNER (El reconocimiento)** es la pantalla más importante emocionalmente. Solo texto grande, mucho espacio en blanco, sin imágenes. La emoción la genera el copy, no el diseño.

2. **P2 de bifurcación** es la más crítica técnicamente. Las cards deben ser clarísimas. Agregar siempre: *"¿Te equivocaste? Puedes volver atrás."*

3. **P8 del OWNER (Promesa final)** debe sentirse como una llegada. El botón dice "Crear mi hogar" — no "Continuar" ni "Siguiente".

4. **Flujo DOMESTIC HELP** no tiene promesa emocional al final. Va directo a tareas. Es intencional. Diseño más limpio, menos texto, íconos más grandes.

5. **Imágenes ilustrativas:** Entregar en PNG limpio sin el efecto de degradado. El degradado se aplica en código con `LinearGradient` de transparente a beige. Comprimir en Squoosh antes de subir al proyecto: WebP · Quality 75 · Effort 5 · Resize 800px · Filter sharpness 3 · Spatial noise shaping 70.

6. **Colores del sistema:**
   - Verde principal: `#1B4D3E`
   - Naranja acento: `#E8622A`
   - Beige fondo: `#F5F0EB`
   - No usar otros colores en el onboarding sin consultar.

7. **Botones de Google y Apple:** Seguir las guidelines oficiales de diseño de cada empresa exactamente. El orden siempre es: primero Google, luego Apple. En Android el botón de Apple puede omitirse.

---

*Noma · Onboarding Definitivo v1.0 · Abril 2026 · Listo para diseño*
