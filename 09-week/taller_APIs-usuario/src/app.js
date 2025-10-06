const express = require("express");
const usuariosRoutes = require("./routes/usuarios.routes");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

/**
 * Aplicación principal de Express.js para la API de gestión de usuarios.
 * Configura el servidor, middleware JSON, documentación Swagger y rutas de usuarios.
 * Esta app se exporta como módulo para ser iniciada en un archivo principal (e.g., index.js con app.listen()).
 * 
 * @module app
 * @requires express
 * @requires ./routes/usuarios.routes
 * @requires swagger-ui-express
 * @requires swagger-jsdoc
 * @exports {Object} app - Instancia de Express configurada.
 * 
 * @example
 * // En index.js o server.js
 * const app = require('./app');
 * const PORT = process.env.PORT || 3001;
 * app.listen(PORT, () => {
 *   console.log(`Servidor corriendo en puerto ${PORT}`);
 * });
 */

const app = express();

/**
 * Middleware para parsear cuerpos de solicitud JSON.
 * Permite recibir datos en formato JSON en las rutas POST/PUT.
 */
app.use(express.json());

/**
 * Configuración de Swagger para documentación automática de la API.
 * Usa OpenAPI 3.0.0 y escanea archivos de rutas para generar specs basados en comentarios JSDoc/Swagger.
 * 
 * @type {Object}
 * @property {string} openapi - Versión de OpenAPI.
 * @property {Object} info - Información general de la API.
 * @property {Array} servers - URLs base del servidor (ajustar para producción).
 * @property {Object} components - Componentes reutilizables como securitySchemes para JWT.
 * @property {Array} apis - Patrones de archivos a escanear para documentación (e.g., rutas con @swagger).
 */
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Usuarios",
      version: "1.0.0",
      description: "Documentación de API REST para la gestión de usuarios con autenticación JWT y operaciones CRUD.",
      // Opcional: Agregar más detalles para una doc más completa
      // contact: {
      //   name: "Desarrollador API",
      //   email: "dev@example.com"
      // },
      // license: {
      //   name: "MIT",
      //   url: "https://opensource.org/licenses/MIT"
      // }
    },
    servers: [
      {
        url: "http://localhost:3001",
        description: "Servidor de desarrollo local"
      }
      // Opcional: Agregar para producción
      // {
      //   url: "https://api.example.com",
      //   description: "Servidor de producción"
      // }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Token JWT generado en /api/usuarios/login. Inclúyelo en el header Authorization como 'Bearer <token>'."
        }
      }
    }
  },
  apis: ["./src/routes/*.js"]  // Ajustar el path si la estructura de carpetas es diferente (e.g., si routes está en src/)
};

/**
 * Genera las especificaciones de Swagger a partir de las opciones y comentarios JSDoc en las rutas.
 * Monta Swagger UI en /api-docs para visualizar la documentación interactiva.
 */
const swaggerSpec = swaggerJsdoc(options);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  // Opcional: Configuraciones adicionales para Swagger UI
  swaggerOptions: {
    persistAuthorization: true,  // Mantiene el token JWT en sesiones de Swagger UI
    docExpansion: "none",  // Colapsa secciones por defecto para mejor UX
    tryItOutEnabled: true  // Habilita "Try it out" para probar endpoints directamente
  }
}));

/**
 * Monta las rutas de usuarios en /api/usuarios.
 * Incluye endpoints públicos (POST /, POST /login) y protegidos (GET/GET/:id/PUT/:id/DELETE/:id) con authMiddleware.
 */
app.use("/api/usuarios", usuariosRoutes);

/**
 * Middleware de manejo de errores global (opcional, pero recomendado).
 * Captura errores no manejados y responde con JSON estandarizado.
 * 
 * @param {Error} err - Error capturado.
 * @param {Object} req - Solicitud.
 * @param {Object} res - Respuesta.
 * @param {Function} next - Next.
 */
// app.use((err, req, res, next) => {
//   console.error("Error global:", err);
//   res.status(500).json({ error: "Error interno del servidor" });
// });

/**
 * Middleware para rutas no encontradas (opcional).
 * Responde 404 para endpoints inexistentes.
 */
// app.use((req, res) => {
//   res.status(404).json({ error: "Endpoint no encontrado" });
// });

module.exports = app;
