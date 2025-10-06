const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "123456";  // Usa la misma clave secreta del .env

/**
 * Middleware para autenticación JWT.
 * Verifica el token en el header Authorization (formato Bearer <token>).
 * Si el token es válido, decodifica la información del usuario y la adjunta a `req.user`.
 * Si no, responde con un error 401.
 * 
 * @module authMiddleware
 * @exports {Function} authMiddleware - Función middleware para Express.js.
 * 
 * @example
 * // Uso en rutas de Express
 * app.get('/protected', authMiddleware, (req, res) => {
 *   res.json({ user: req.user });
 * });
 */

/**
 * Middleware de autenticación JWT.
 * 
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} req.headers - Headers de la solicitud.
 * @param {string} [req.headers.authorization] - Header Authorization con formato "Bearer <token>".
 * @param {Object} res - Objeto de respuesta de Express.
 * @param {Function} next - Función next() de Express para continuar al siguiente middleware/controlador.
 * @returns {Promise<void>|void} - Si el token es válido, llama a next(). Si no, responde con error 401.
 * @throws {Error} - Errores de JWT (e.g., token inválido, expirado) se capturan y responden como 401.
 */
const authMiddleware = (req, res, next) => {
  try {
    // Extraer el token del header Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token no proporcionado o inválido" });
    }
    const token = authHeader.split(" ")[1];  // Quita "Bearer " y toma el token
    // Verificar el token
    const decoded = jwt.verify(token, SECRET);
    
    // Agregar el usuario decodificado a req para usarlo en controladores
    req.user = decoded;  // decoded contiene { sub: id, email, iat, exp }
    
    next();  // Continuar al controlador
  } catch (error) {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
};

module.exports = authMiddleware;
