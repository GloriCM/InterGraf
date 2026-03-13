# InterGea – Especificación de Módulos del Sistema

## Módulo 1: Registro de Empresas y Acceso

### 1.1 Registro de Empresas

Campos requeridos:

- Razón social
- NIT / RUT
- Dirección legal
- Ciudad y país
- Sector Empresarial  
- Correo electrónico corporativo
- Teléfono de contacto
- Logo empresarial

**Reglas adicionales:**

- Se deberá implementar un proceso de **verificación empresarial** (manual o automatizado).
- **Solo empresas verificadas** podrán comprar o vender dentro de la plataforma.

---

### 1.2 Inicio de Sesión (Login)

Campos:

- Correo corporativo
- Contraseña
- Autenticación en dos pasos (**2FA**)

---

### 1.3 Recuperación de Contraseña

El sistema deberá permitir la **recuperación segura de contraseña** mediante el envío de un enlace al **correo corporativo registrado**.

---

### 1.4 Gestión del Perfil Empresarial

La empresa podrá:

- Editar datos de contacto
- Actualizar dirección
- Cambiar logo
- Modificar descripción del negocio
- Agregar portafolio de trabajos *(opcional, enfocado al sector gráfico)*

---

# Módulo 2: Ventas (Empresa como Proveedor)

## 2.1 Gestión de Productos

### Crear productos

Campos:

- Nombre del producto
- Descripción técnica  
- Categoría  
- Imágenes de alta calidad
- Precio unitario
- Precios por volumen *(descuentos por cantidad)*
- Cantidad mínima de pedido
- Disponibilidad de stock
- Tiempo estimado de producción o entrega

Opciones:

- Editar productos
- Eliminar productos

---

## 2.2 Gestión de Inventario

El sistema deberá permitir:

- Actualización manual del stock
- Actualización automática del inventario al concretarse una venta
- Alertas de bajo inventario
- Historial de movimientos de inventario

---

## 2.3 Gestión de Pedidos Recibidos

La empresa proveedora podrá:

- Visualizar pedidos recibidos
- Cambiar el estado del pedido:

Estados disponibles:

- Pendiente
- En preparación
- En producción *(En caso de ser necesario)
- Enviado
- Entregado
- Cancelado

Otras funciones:

- Comunicarse con el comprador mediante **mensajería interna**
- Adjuntar **comprobantes o documentos internos**

---

## 2.4 Reputación como Vendedor

El sistema deberá permitir:

- Calificaciones (**1 a 5 estrellas**)
- Reseñas escritas
- Visualización pública del promedio de calificación
- Historial de reseñas visibles en el perfil empresarial

---

# Módulo 3: Compras (Empresa como Cliente)

## 3.1 Búsqueda y Exploración

Opciones de búsqueda y filtrado:

- Búsqueda por nombre
- Filtro por categoría
- Filtro por proveedor
- Filtro por ciudad
- Filtro por rango de precio
- Filtro por calificación
- Filtro por tiempos de entrega

---

## 3.2 Carrito de Compras

Funciones:

- Agregar productos de diferentes proveedores
- Modificar cantidades
- Eliminar productos
- Visualizar **subtotal por proveedor**
- Visualizar **total general**

---

## 3.3 Generación de Cotizaciones

Antes de confirmar un pedido el sistema deberá permitir:

- Generar **cotización en PDF**

La cotización debe incluir:

- Datos del comprador
- Datos del proveedor
- Productos seleccionados
- Cantidades
- Precios unitarios
- Total
- Fecha de generación

Opciones:

- Descargar el PDF
- Compartir el PDF

---

## 3.4 Gestión de Pedidos Realizados

La empresa compradora podrá:

- Ver historial de pedidos
- Consultar estado actual
- Descargar facturas
- Repetir pedido
- Cancelar pedido *(según estado)*
- Calificar proveedor

---

# Módulo 4: Cambio de Vista (Modelo Dual Comprador/Vendedor)

## 4.1 Selector de Rol

El sistema deberá permitir a la empresa cambiar entre:

- 🔵 **Vista Comprador**
- 🟣 **Vista Vendedor**

El cambio deberá:

- Ser inmediato
- Mantener la sesión activa
- Adaptar la interfaz según el rol seleccionado

---

# Requerimientos No Funcionales

- Aplicación móvil (**Android inicialmente**)
- Interfaz **intuitiva y minimalista**
- Seguridad en datos empresariales
- **Encriptación de credenciales**
- Tiempo de respuesta **menor a 3 segundos**
- **Arquitectura escalable**
- **Base de datos segura**
- Cumplimiento con **normativa fiscal colombiana**
