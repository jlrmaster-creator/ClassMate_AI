# ClassMate AI — Prompt de implementación

## 1. Contexto y Rol

Actúa como un **arquitecto de software senior, desarrollador full-stack, especialista en IA y diseñador UX/UI especializado en aplicaciones educativas mobile-first**.

Debes diseñar e implementar una aplicación web/PWA llamada provisionalmente **ClassMate AI**, orientada a estudiantes de instituto.

La aplicación debe funcionar perfectamente en:

* 📱 Móviles Android
* 📱 iPhone
* 📱 Tablets
* 💻 Ordenadores

La prioridad de diseño y experiencia es **mobile-first**.

---

# 2. Objetivo del producto

ClassMate AI es un asistente personal de estudios que ayuda a estudiantes a gestionar:

* Tareas
* Deberes
* Exámenes
* Proyectos
* Trabajos
* Fechas de entrega
* Sesiones de estudio

La idea principal del producto es:

> **"Tú dime qué te han mandado. ClassMate AI organiza cuándo y cómo hacerlo."**

La aplicación no debe sentirse como una agenda escolar tradicional.

Debe sentirse como un **asistente personal de estudios**.

El estudiante debe poder abrir la aplicación y responder rápidamente a:

> **¿Qué tengo que hacer hoy?**

Y también:

> **Tengo 30 minutos. ¿Qué puedo hacer ahora?**

---

# 3. Objetivo técnico

Construye un **MVP completamente funcional**, no una simple maqueta visual.

La aplicación debe permitir:

1. Crear una cuenta.
2. Iniciar sesión.
3. Configurar asignaturas.
4. Crear tareas manualmente.
5. Crear tareas mediante lenguaje natural.
6. Crear tareas a partir de imágenes.
7. Subir documentos relacionados con tareas.
8. Detectar información mediante IA.
9. Crear proyectos.
10. Dividir proyectos en subtareas mediante IA.
11. Generar planes de estudio.
12. Consultar las tareas del día.
13. Consultar calendario.
14. Marcar tareas como completadas.
15. Recibir recordatorios.
16. Consultar estadísticas básicas.
17. Instalar la aplicación como PWA.
18. Funcionar correctamente en móviles.
19. Editar cualquier información generada por IA.
20. Eliminar la cuenta y los datos asociados.

---

# 4. Filosofía de producto

La aplicación debe minimizar el trabajo manual del estudiante.

En lugar de:

> Crear tarea → elegir asignatura → poner fecha → estimar duración → crear subtareas → organizar calendario.

El usuario debería poder escribir:

> "Para el viernes tengo que hacer los ejercicios 12 al 25 de matemáticas."

Y la aplicación debería convertirlo automáticamente en:

```json
{
  "subject": "Matemáticas",
  "title": "Ejercicios 12-25",
  "dueDate": "viernes",
  "estimatedMinutes": 45,
  "difficulty": "medium"
}
```

Antes de guardar información importante generada por IA, mostrar una pantalla de confirmación.

---

# 5. Stack tecnológico

## Frontend

Utilizar:

* React
* TypeScript
* Vite
* Tailwind CSS

Utilizar TypeScript en modo estricto.

Evitar dependencias innecesarias.

---

# 6. Backend y base de datos

Utilizar obligatoriamente **Firebase**.

Servicios:

* Firebase Authentication
* Cloud Firestore
* Firebase Storage
* Firebase Cloud Functions
* Firebase Cloud Messaging cuando sea necesario

Firebase será la infraestructura principal de backend y base de datos.

---

# 7. Filosofía Open Source

El proyecto debe priorizar tecnologías y dependencias **open source**.

No utilizar servicios propietarios innecesarios.

La arquitectura debe permitir sustituir posteriormente cualquier servicio de terceros.

Especialmente la IA debe estar desacoplada del resto del sistema.

Crear una abstracción:

```text
AIService
```

La aplicación no debe depender directamente de un proveedor específico.

Debe ser posible implementar posteriormente:

```text
OpenAI
Anthropic
Gemini
Ollama
Modelos locales
Modelos open source
```

sin modificar toda la aplicación.

---

# 8. Arquitectura

Utilizar una arquitectura modular.

Propuesta:

```text
src/
├── components/
├── pages/
├── features/
│   ├── auth/
│   ├── tasks/
│   ├── projects/
│   ├── subjects/
│   ├── planner/
│   ├── calendar/
│   ├── notifications/
│   └── statistics/
├── services/
│   ├── authService.ts
│   ├── taskService.ts
│   ├── projectService.ts
│   ├── subjectService.ts
│   ├── plannerService.ts
│   ├── notificationService.ts
│   ├── storageService.ts
│   └── aiService.ts
├── hooks/
├── types/
├── utils/
├── firebase/
├── ai/
└── styles/
```

Evitar introducir lógica compleja directamente dentro de componentes React.

---

# 9. Firebase — modelo de datos

Utilizar una estructura similar a:

```text
users/{userId}

users/{userId}/subjects/{subjectId}

users/{userId}/tasks/{taskId}

users/{userId}/projects/{projectId}

users/{userId}/projects/{projectId}/subtasks/{subtaskId}

users/{userId}/studySessions/{sessionId}

users/{userId}/notifications/{notificationId}

users/{userId}/settings/{settingsId}
```

Cada documento debe incluir cuando corresponda:

```text
createdAt
updatedAt
```

Utilizar timestamps del servidor cuando sea apropiado.

---

# 10. Modelo de usuario

Ejemplo:

```typescript
interface UserProfile {
  id: string;
  displayName?: string;
  email?: string;

  schoolYear?: string;

  dailyStudyMinutes?: number;

  subjects?: string[];

  notificationSettings?: {
    enabled: boolean;
    startTime?: string;
    endTime?: string;
  };

  theme?: "light" | "dark" | "system";

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Puedes modificar el modelo si existe una arquitectura técnicamente mejor.

---

# 11. Modelo Task

Utilizar como base:

```typescript
interface Task {
  id: string;
  userId: string;

  subjectId?: string;

  title: string;
  description?: string;

  status:
    | "pending"
    | "in_progress"
    | "completed";

  priority:
    | "low"
    | "medium"
    | "high";

  difficulty?:
    | "easy"
    | "medium"
    | "hard";

  dueDate?: Timestamp;

  estimatedMinutes?: number;

  source?:
    | "manual"
    | "ai"
    | "image"
    | "document"
    | "voice";

  projectId?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

# 12. Pantallas principales

La aplicación debe tener una navegación sencilla.

En móvil utilizar bottom navigation:

```text
🏠 Hoy
📚 Tareas
📁 Proyectos
➕ Añadir
👤 Perfil
```

---

# 13. Pantalla Hoy

Esta será la pantalla principal.

Ejemplo:

```text
Buenos días 👋

Tienes 3 cosas importantes hoy.

🔴 PRIORIDAD

Matemáticas
Ejercicios 12–25
⏱️ 35 min

🟡 DESPUÉS

Historia
Buscar información
⏱️ 20 min

🟢 SI TIENES TIEMPO

Inglés
Repasar vocabulario
⏱️ 15 min
```

Mostrar un botón destacado:

```text
⏱️ TENGO X MINUTOS
```

---

# 14. Función "Tengo X minutos"

Cuando el usuario pulse:

```text
Tengo X minutos
```

mostrar:

```text
15 minutos
30 minutos
45 minutos
1 hora
Personalizado
```

Después analizar:

* tareas pendientes
* fechas de entrega
* prioridad
* dificultad
* tiempo estimado
* proyectos
* tareas atrasadas

Y generar un plan.

Ejemplo:

```text
⏱️ PLAN DE 30 MINUTOS

15 min
Matemáticas
Ejercicios 12–16

10 min
Inglés
Repasar vocabulario

5 min
Historia
Buscar dos fuentes
```

El plan debe ser realista.

---

# 15. Crear tareas

La pantalla de añadir debe ser extremadamente sencilla.

Mostrar:

> **¿Qué tienes que hacer?**

Opciones:

```text
✍️ Escribir

🎙️ Hablar

📸 Foto

📄 Documento
```

---

# 16. Entrada mediante lenguaje natural

Ejemplo:

```text
Para el viernes tengo que hacer los ejercicios
12 al 25 de matemáticas.
```

La IA debe extraer:

```text
Asignatura: Matemáticas
Título: Ejercicios 12–25
Entrega: Viernes
Tiempo estimado: 45 min
Dificultad: Media
```

Mostrar:

> **He entendido esto:**

Y permitir:

```text
[Editar]

[Guardar]
```

Nunca confiar ciegamente en información generada por IA.

---

# 17. Entrada mediante fotografía

El estudiante puede fotografiar:

* Pizarra
* Agenda
* Hoja de ejercicios
* Documento
* Apuntes

La IA debe intentar detectar:

* asignatura
* tarea
* fecha
* duración estimada
* prioridad

Si hay varias tareas:

```text
He encontrado 3 posibles tareas:

☑ Matemáticas — Ejercicios 12–25
☑ Historia — Leer capítulo 4
☑ Inglés — Preparar presentación

[Editar]

[Guardar seleccionadas]
```

Si existe incertidumbre, solicitar confirmación.

---

# 18. Documentos

Permitir subir documentos relacionados con tareas.

Formatos iniciales:

```text
PDF
JPG
PNG
WEBP
```

Utilizar Firebase Storage.

No almacenar archivos innecesariamente.

Implementar límites de:

* tamaño
* cantidad
* tipo MIME

---

# 19. Proyectos

Un proyecto representa un trabajo grande.

Ejemplo:

```text
Trabajo de Historia

Entrega:
20 octubre

Progreso:
60%
```

Subtareas:

```text
☑ Elegir tema
☑ Buscar información
☑ Crear esquema
☐ Escribir contenido
☐ Conclusiones
☐ Preparar presentación
```

---

# 20. IA para proyectos

Entrada:

> Trabajo de Historia sobre la Revolución Francesa para el 20 de octubre.

La IA debe generar una propuesta como:

```text
1. Elegir enfoque
2. Buscar información
3. Crear esquema
4. Buscar fuentes
5. Escribir introducción
6. Desarrollar contenido
7. Crear conclusiones
8. Revisar
9. Preparar presentación
```

Cada subtarea debe tener:

* título
* descripción
* duración estimada
* fecha recomendada
* estado

El estudiante puede modificar cualquier elemento.

---

# 21. Planificador inteligente

Crear:

```typescript
generateStudyPlan()
```

Debe considerar:

```text
deadline
estimatedDuration
priority
difficulty
currentDate
availableTime
studentPreferences
existingSchedule
```

Debe evitar:

* dejar todo para el último día
* crear sesiones imposibles
* superar el tiempo disponible
* ignorar tareas atrasadas

Para proyectos grandes debe distribuir el trabajo.

---

# 22. Sistema de prioridades

Calcular una prioridad recomendada considerando:

* cercanía de la fecha de entrega
* duración
* dificultad
* estado
* retraso
* importancia indicada por el estudiante

Cuando sea útil explicar:

> ⚠️ Esta tarea aparece arriba porque vence mañana y requiere aproximadamente 90 minutos.

---

# 23. Calendario

Implementar:

* Vista diaria
* Vista semanal
* Vista mensual

La vista "Hoy" seguirá siendo la experiencia principal.

El calendario no debe convertirse en una aplicación compleja de gestión de tiempo.

---

# 24. Estadísticas

Mostrar información sencilla:

```text
Esta semana

✅ 12 tareas completadas

⏱️ 4 h 20 min estudiadas

📚 3 asignaturas

🔥 5 días activos
```

No fomentar sesiones de estudio excesivamente largas.

---

# 25. Gamificación

Utilizar gamificación ligera.

Mostrar:

* tareas completadas
* días activos
* proyectos terminados
* tiempo estudiado
* tareas completadas a tiempo

Evitar:

* rankings competitivos
* presión excesiva
* recompensas infantiles
* mecanismos que incentiven estudiar de forma poco saludable

---

# 26. Diseño UX/UI

El diseño debe ser:

* moderno
* limpio
* juvenil
* amigable
* minimalista
* accesible
* rápido

Evitar:

* interfaces infantiles
* exceso de colores
* demasiadas tarjetas
* tablas complejas
* menús profundos

Utilizar:

* botones grandes
* iconos sencillos
* buena jerarquía
* espacios generosos
* tipografía legible
* feedback visual

Debe poder utilizarse cómodamente con una sola mano.

---

# 27. Responsive Design

La aplicación debe adaptarse a:

```text
320px+
480px+
768px+
1024px+
1440px+
```

Prioridad:

```text
Mobile
↓
Tablet
↓
Desktop
```

No crear una versión móvil completamente diferente.

Utilizar responsive design.

---

# 28. Dark Mode

Implementar:

```text
Light
Dark
System
```

Guardar la preferencia del usuario.

---

# 29. PWA

La aplicación debe poder instalarse como PWA.

Implementar:

* Web App Manifest
* Service Worker
* iconos
* splash/metadata
* caché apropiada
* funcionamiento offline básico

El usuario debe poder instalarla desde el navegador cuando el sistema lo permita.

---

# 30. Notificaciones

Implementar recordatorios.

Ejemplos:

```text
📚 Mañana tienes el examen de Matemáticas.

⏰ Hoy tienes pendiente avanzar en tu proyecto de Historia.
```

No enviar demasiadas notificaciones.

Permitir configurar:

```text
Activadas / Desactivadas

Horario

Frecuencia
```

---

# 31. Autenticación

Utilizar Firebase Authentication.

Implementar inicialmente:

* Email + contraseña
* Logout
* Recuperación de contraseña

Preparar arquitectura para poder añadir posteriormente:

* Google
* Apple
* otros proveedores

---

# 32. Seguridad Firebase

Implementar Security Rules estrictas.

Un usuario solamente puede acceder a:

```text
users/{su-propio-userId}/...
```

Nunca permitir:

```text
allow read, write: if true;
```

Las operaciones administrativas deben ejecutarse mediante Cloud Functions.

Validar datos tanto en frontend como backend.

---

# 33. Privacidad

La aplicación está dirigida potencialmente a menores.

Diseñar teniendo en cuenta:

* minimización de datos
* privacidad por defecto
* no vender datos
* no publicidad personalizada basada en datos académicos
* almacenamiento mínimo
* eliminación de cuenta
* eliminación de datos
* control de acceso

No guardar información innecesaria.

Los archivos subidos deben poder eliminarse.

Diseñar la arquitectura para añadir posteriormente mecanismos de consentimiento parental y cumplimiento de las normativas aplicables.

---

# 34. IA y privacidad

La aplicación debe dejar claro qué información se envía a servicios de IA.

No enviar información innecesaria.

No enviar credenciales.

No enviar tokens de autenticación.

No enviar datos personales que no sean necesarios para realizar la operación.

La capa:

```text
AIService
```

debe permitir sustituir fácilmente proveedores externos por modelos locales/open source.

---

# 35. Manejo de errores

La IA nunca debe ser un punto único de fallo.

Si falla:

```text
No hemos podido procesar esto.

Puedes añadir la tarea manualmente.
```

Implementar estados:

```text
loading
success
error
empty
offline
```

Nunca mostrar errores técnicos al usuario final.

---

# 36. Estados vacíos

Ejemplo:

```text
🎉 No tienes tareas pendientes.

Parece que estás al día.

[+ Añadir tarea]
```

Proyectos:

```text
📁 No tienes proyectos.

Cuando tengas un trabajo grande,
puedes organizarlo aquí.

[Crear proyecto]
```

---

# 37. Onboarding

Crear onboarding corto.

### Paso 1

```text
👋 ¡Hola!

Vamos a organizar tus estudios.
```

### Paso 2

Seleccionar asignaturas:

```text
☑ Matemáticas
☑ Lengua
☑ Inglés
☑ Historia
☑ Física
☑ Química
```

### Paso 3

Preguntar:

```text
¿Cuánto tiempo sueles tener para estudiar?

30 min
1 h
1–2 h
Variable
```

### Paso 4

Mostrar:

```text
Tu espacio de estudio está listo.
```

---

# 38. Accesibilidad

Seguir buenas prácticas WCAG.

Como mínimo:

* contraste adecuado
* navegación por teclado
* labels accesibles
* botones táctiles grandes
* soporte para lectores de pantalla
* mensajes de error claros
* focus states visibles

---

# 39. Rendimiento

Optimizar especialmente para dispositivos móviles.

Implementar:

* lazy loading
* compresión de imágenes
* optimización de consultas Firestore
* listeners únicamente cuando sean necesarios
* caché apropiada
* minimizar renders React
* code splitting

La aplicación debe sentirse rápida incluso en móviles modestos.

---

# 40. Gestión offline

Implementar soporte offline razonable para:

* visualizar tareas almacenadas
* visualizar proyectos
* crear/editar información básica cuando sea viable
* sincronizar posteriormente

La generación mediante IA obviamente requerirá conexión.

Mostrar claramente cuando el usuario esté offline.

---

# 41. Testing

Crear:

## Unit tests

Para:

* prioridades
* fechas
* planificación
* estimación de duración
* validaciones

## Integration tests

Para:

* Firebase Auth
* Firestore
* Storage
* tareas
* proyectos

## E2E

Flujo:

```text
Registro
↓
Login
↓
Crear asignaturas
↓
Crear tarea
↓
Generar plan
↓
Completar tarea
↓
Crear proyecto
↓
Dividir proyecto mediante IA
```

---

# 42. Variables de entorno

No introducir secretos en el código.

Utilizar:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

AI_PROVIDER=
AI_API_KEY=
```

Crear:

```text
.env.example
```

Nunca subir:

```text
.env
```

al repositorio.

---

# 43. Documentación

Crear:

```text
README.md
ARCHITECTURE.md
FIREBASE_SETUP.md
AI_SETUP.md
SECURITY.md
```

## README.md

Debe explicar:

1. Qué es ClassMate AI.
2. Tecnologías.
3. Requisitos.
4. Instalación.
5. Variables de entorno.
6. Firebase.
7. IA.
8. Desarrollo local.
9. Tests.
10. Build.
11. Deploy.

## ARCHITECTURE.md

Explicar:

* arquitectura
* componentes
* servicios
* Firebase
* modelo de datos
* IA
* flujo de información

## FIREBASE_SETUP.md

Explicar:

* Authentication
* Firestore
* Storage
* Functions
* Messaging
* Security Rules

## AI_SETUP.md

Explicar:

* AIService
* proveedor utilizado
* variables necesarias
* cómo cambiar de proveedor
* cómo utilizar un modelo local/open source

## SECURITY.md

Documentar:

* reglas Firebase
* autenticación
* autorización
* protección de datos
* almacenamiento
* gestión de secretos

---

# 44. Git

Crear commits lógicos.

Ejemplo:

```text
feat: initialize React application
feat: configure Firebase
feat: add authentication
feat: add subjects
feat: add task management
feat: add project management
feat: add AI task extraction
feat: add AI project planner
feat: add study planner
feat: add PWA
feat: add notifications
test: add planner tests
test: add task tests
docs: add setup documentation
```

---

# 45. Orden de implementación

No implementar todo simultáneamente.

## Fase 1 — Base

Implementar:

* React
* TypeScript
* Vite
* Tailwind
* Firebase
* Authentication
* Firestore
* Security Rules
* estructura modular

Primero comprobar que:

```text
npm install
npm run dev
npm run build
```

funcionan correctamente.

---

## Fase 2 — Core

Implementar:

* asignaturas
* tareas
* proyectos
* subtareas
* pantalla Hoy
* estados
* filtros

---

## Fase 3 — IA

Implementar:

* lenguaje natural
* extracción de tareas
* análisis de imágenes
* análisis de documentos
* generación de subtareas
* planificación inteligente

---

## Fase 4 — Experiencia

Implementar:

* PWA
* responsive
* dark mode
* calendario
* notificaciones
* estadísticas
* onboarding

---

## Fase 5 — Calidad

Realizar:

* tests
* accesibilidad
* seguridad
* rendimiento
* revisión Firebase
* revisión IA
* revisión responsive
* documentación
* deploy

---

# 46. Criterios de aceptación

El MVP estará terminado cuando un usuario pueda:

* [ ] Registrarse
* [ ] Iniciar sesión
* [ ] Cerrar sesión
* [ ] Crear asignaturas
* [ ] Crear tareas
* [ ] Editar tareas
* [ ] Completar tareas
* [ ] Eliminar tareas
* [ ] Crear tareas mediante lenguaje natural
* [ ] Crear tareas mediante imagen
* [ ] Crear proyectos
* [ ] Dividir proyectos con IA
* [ ] Ver tareas del día
* [ ] Utilizar "Tengo X minutos"
* [ ] Generar un plan de estudio
* [ ] Consultar calendario
* [ ] Recibir recordatorios
* [ ] Consultar estadísticas
* [ ] Activar dark mode
* [ ] Instalar la PWA
* [ ] Utilizarla correctamente en móvil
* [ ] Eliminar su cuenta
* [ ] Eliminar sus datos

---

# 47. Reglas importantes

Durante el desarrollo:

1. No crear funcionalidades ficticias.
2. No dejar botones sin funcionalidad.
3. No utilizar datos falsos en producción.
4. No hardcodear secretos.
5. No utilizar dependencias innecesarias.
6. Utilizar Firebase como backend.
7. Utilizar TypeScript estricto.
8. Mantener el código modular.
9. Priorizar mobile-first.
10. Priorizar accesibilidad.
11. Priorizar seguridad.
12. Permitir editar cualquier resultado de IA.
13. No depender completamente de la IA.
14. La aplicación debe seguir funcionando si la IA falla.
15. No bloquear la experiencia del usuario por errores externos.
16. Mantener desacoplado el proveedor de IA.
17. Minimizar la recopilación de datos personales.
18. No introducir mecanismos de monetización invasivos.
19. No utilizar publicidad personalizada basada en datos académicos.
20. Documentar cualquier decisión arquitectónica importante.

---

# 48. Revisión final

Antes de considerar terminado el proyecto, realiza una auditoría final.

Comprobar:

## Código

* [ ] TypeScript sin errores
* [ ] Sin código muerto
* [ ] Sin imports innecesarios
* [ ] Componentes reutilizables
* [ ] Arquitectura modular

## Firebase

* [ ] Security Rules correctas
* [ ] Auth funcionando
* [ ] Firestore funcionando
* [ ] Storage protegido
* [ ] Functions protegidas
* [ ] Índices necesarios configurados

## IA

* [ ] AIService desacoplado
* [ ] Manejo de errores
* [ ] Validación de respuestas
* [ ] Confirmación de información dudosa
* [ ] No exposición de API keys

## UX

* [ ] Mobile-first
* [ ] Responsive
* [ ] Dark mode
* [ ] Estados vacíos
* [ ] Loading states
* [ ] Error states
* [ ] Accesibilidad

## PWA

* [ ] Manifest
* [ ] Service worker
* [ ] Iconos
* [ ] Instalación
* [ ] Caché

## Seguridad

* [ ] Secretos fuera del repositorio
* [ ] Datos aislados por usuario
* [ ] Validación backend
* [ ] Eliminación de cuenta
* [ ] Eliminación de datos

## Testing

* [ ] Unit tests
* [ ] Integration tests
* [ ] E2E
* [ ] Build de producción

---

# 49. Resultado final

El resultado debe ser una aplicación web/PWA real llamada:

# ClassMate AI

Su propuesta de valor:

> **“Tú dime qué te han mandado. Nosotros organizamos cuándo y cómo hacerlo.”**

La aplicación debe permitir que un estudiante pase de:

```text
Tengo 5 tareas
+ 2 exámenes
+ 1 proyecto
+ poco tiempo
```

a:

```text
HOY

🔴 Matemáticas
35 min

🟡 Historia
20 min

🟢 Inglés
15 min

⏱️ Total: 1 h 10 min

✓ Todo lo importante está bajo control.
```

El objetivo no es crear otra lista de tareas.

El objetivo es crear un **asistente inteligente de organización académica**, sencillo, amigable, rápido y especialmente diseñado para estudiantes de instituto.

**Construye primero el MVP funcional siguiendo las fases indicadas. No intentes implementar funcionalidades futuras antes de terminar y validar el núcleo de la aplicación.**
