# CronoPE — Simulador de Cronograma de Pagos (Perú · Ingeniería Económica)

Aplicación web responsive para simular cronogramas de pago bajo estándares financieros del **Perú (SBS · Base 360 días)** y conceptos fundamentales del curso de **Ingeniería Económica**, con soporte para plazos de hasta **48 meses (4 años)** y exportación profesional a **PDF** y **Excel (`.xlsx`) con fórmulas dinámicas**.

**Alumno:** Lindbergh Paredes · **Docente:** Jimmy Luigi Zevallos Toribio · **Curso:** Ingeniería Económica

## Características Principales

- **Variables clásicas de Ingeniería Económica (`P`, `n`, `i`)**:
  - **`P` (Principal / Capital)**: En Soles (`S/`) o Dólares (`US$`), con opción de calcular desde *Precio del Bien − Cuota Inicial (%)*.
  - **`n` (Plazo)**: Ingreso en años, meses o cuotas directas (**máximo 48 meses / 4 años**) y frecuencia de pago (*Mensual, Bimestral, Trimestral, Semestral o Anual*).
  - **`i` (Tasa de Interés)**: Conversión automática bajo base peruana de **360 días** desde **TEA**, **Tasa Efectiva del Periodo** (`TEM`, `TEB`, `TET`, `TES`) o **TNA** (con capitalización diaria, mensual, trimestral, etc.). Soporta el caso borde `i = 0%` sin errores.
- **3 Sistemas de Amortización + Comparativa**:
  - **Método Francés** (Cuota constante · Estándar SBS Perú)
  - **Método Alemán** (Amortización constante · Cuota decreciente)
  - **Método Americano** (Intereses periódicos · Capital al vencimiento)
- **Doble Modalidad**:
  - **Modo Académico Puro**: Cálculos limpios solo con `P`, `n` e `i`.
  - **Modo Banca Perú / SBS**: Seguro de desgravamen (% mensual), portes/comisiones, **periodos de gracia** (Parcial o Total amortizando en `n - g` periodos), fechas de vencimiento y cálculo numérico de **TIR y TCEA**.
- **Módulo Educativo *Paso a Paso***: Diagrama de Flujo de Caja SVG interactivo y sustitución en vivo de fórmulas.
- **Exportación Profesional**:
  - **PDF Multi-página** (`jsPDF` + `jspdf-autotable`) con cabecera personalizable (Universidad, Curso, Docente, Alumno).
  - **Excel `.xlsx` Dinámico** (`ExcelJS`) con estilos y fórmulas nativas recalculables adaptadas a cada método (`PMT` con guardia `IF` para Francés, `P_ef / (n - g)` para Alemán, pago final para Americano).
- **Diseño 100% Responsive**: Vista de tarjetas y navegación flotante en celular + tablero completo de 2 columnas en PC/laptop.

## Stack Tecnológico

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS v4**
- **Recharts** (Gráficos interactivos)
- **jsPDF** + **jspdf-autotable** (Exportación PDF)
- **ExcelJS** (Exportación Excel con fórmulas vivas)
- **Vitest** (Pruebas unitarias del motor financiero y exportadores)

## Ejecución Local

```bash
# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm dev

# Ejecutar pruebas unitarias
pnpm test

# Compilar para producción
pnpm build
```
