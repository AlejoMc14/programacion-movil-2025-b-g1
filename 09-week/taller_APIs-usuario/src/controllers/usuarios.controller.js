const prisma = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "123456";

/**
 * Módulo de controladores para la gestión de usuarios.
 * Incluye operaciones CRUD para usuarios con autenticación JWT y hashing de contraseñas con bcrypt.
 * Todas las funciones son manejadores de rutas Express.js asíncronos.
 * 
 * @module userControllers
 * @exports {Object} - Objeto con métodos para crear, autenticar y gestionar usuarios.
 */

/**
 * Crea un nuevo usuario en la base de datos.
 * Esta función es pública (no requiere autenticación).
 * Valida los campos requeridos, hashea la contraseña y maneja errores de duplicados (email único).
 * 
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} req.body - Cuerpo de la solicitud con los datos del usuario.
 * @param {string} req.body.name - Nombre del usuario (requerido).
 * @param {string} req.body.email - Email del usuario (requerido, debe ser único).
 * @param {string} req.body.password - Contraseña del usuario (requerida).
 * @param {Object} res - Objeto de respuesta de Express.
 * @returns {Promise<void>} - Responde con el usuario creado (sin contraseña) o un error.
 * @throws {Error} - Errores de Prisma o validación.
 */
module.exports = {
  crearUsuario: async (req, res) => {
    try {
      const { name, email, password } = req.body;  
      
      // Validación básica
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email y password son requeridos" });
      }

      const hash = await bcrypt.hash(password, 10);

      const usuario = await prisma.usuario.create({
        data: { name, email, password: hash }  
      });

      res.status(201).json({
        id: usuario.id,
        name: usuario.name,  
        email: usuario.email,
        creation_date: usuario.creation_date  
      });
    } catch (err) {
      console.error("Error en crearUsuario:", err);
      if (err.code === 'P2002') {
        res.status(400).json({ error: "Email ya está en uso" });
      } else {
        res.status(400).json({ error: err.message });
      }
    }
  },

  /**
   * Autentica a un usuario existente y genera un token JWT.
   * Esta función es pública (no requiere autenticación).
   * Busca el usuario por email, verifica la contraseña y genera un token con expiración de 15 minutos.
   * 
   * @param {Object} req - Objeto de solicitud de Express.
   * @param {Object} req.body - Cuerpo de la solicitud con credenciales.
   * @param {string} req.body.email - Email del usuario (requerido).
   * @param {string} req.body.password - Contraseña del usuario (requerida).
   * @param {Object} res - Objeto de respuesta de Express.
   * @returns {Promise<void>} - Responde con el token JWT o un error de autenticación.
   * @throws {Error} - Errores de Prisma, bcrypt o JWT.
   */
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Email y password son requeridos" });
      }

      const usuario = await prisma.usuario.findUnique({ where: { email } });

      if (!usuario) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      const valido = await bcrypt.compare(password, usuario.password);
      if (!valido) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }

      const token = jwt.sign({ sub: usuario.id, email: usuario.email }, SECRET, { expiresIn: "15m" });
      res.json({ token });
    } catch (err) {
      console.error("Error en login:", err);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },

  /**
   * Lista todos los usuarios registrados.
   * Esta función está protegida (requiere middleware de autenticación JWT).
   * Retorna una lista de usuarios sin contraseñas.
   * 
   * @param {Object} req - Objeto de solicitud de Express (incluye req.user del middleware).
   * @param {Object} res - Objeto de respuesta de Express.
   * @returns {Promise<void>} - Responde con un array de usuarios o un error.
   * @throws {Error} - Errores de Prisma.
   */
  listarUsuarios: async (req, res) => {
    try {
      const usuarios = await prisma.usuario.findMany({
        select: { id: true, name: true, email: true, creation_date: true } 
      });
      res.json(usuarios);
    } catch (err) {
      console.error("Error en listarUsuarios:", err);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * Obtiene los detalles de un usuario específico por ID.
   * Esta función está protegida (requiere middleware de autenticación JWT).
   * 
   * @param {Object} req - Objeto de solicitud de Express.
   * @param {string} req.params.id - ID del usuario a obtener.
   * @param {Object} res - Objeto de respuesta de Express.
   * @returns {Promise<void>} - Responde con los datos del usuario (sin contraseña) o un error 404 si no existe.
   * @throws {Error} - Errores de Prisma.
   */
  obtenerUsuarioPorId: async (req, res) => {
    const { id } = req.params;
    try {
      const usuario = await prisma.usuario.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, creation_date: true }  // CAMBIO: name y creation_date
      });
      if (!usuario) {
        return res.status(404).json({ error: "Usuario no encontrado" });
      }
      res.json(usuario);
    } catch (err) {
      console.error("Error en obtenerUsuarioPorId:", err);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * Actualiza los datos de un usuario específico por ID.
   * Esta función está protegida (requiere middleware de autenticación JWT y que el usuario sea el propietario).
   * Permite actualizar nombre, email y/o contraseña. Valida cambios y maneja duplicados de email.
   * 
   * @param {Object} req - Objeto de solicitud de Express (incluye req.user del middleware).
   * @param {string} req.params.id - ID del usuario a actualizar.
   * @param {Object} req.body - Cuerpo de la solicitud con datos a actualizar.
   * @param {string} [req.body.name] - Nuevo nombre (opcional).
   * @param {string} [req.body.email] - Nuevo email (opcional, debe ser único).
   * @param {string} [req.body.password] - Nueva contraseña (opcional, se hashea).
   * @param {Object} res - Objeto de respuesta de Express.
   * @returns {Promise<void>} - Responde con el usuario actualizado (sin contraseña) o un error.
   * @throws {Error} - Errores de Prisma, bcrypt o validación de permisos.
   */
  actualizarUsuario: async (req, res) => {
    const { id } = req.params;
    
    // Verificar auth (req.user del middleware)
    if (!req.user || id !== req.user.sub) {
      return res.status(403).json({ error: "No tienes permiso para actualizar este usuario" });
    }

    try {
      const { name, email, password } = req.body;  
      
      if (!name && !email && !password) {
        return res.status(400).json({ error: "Al menos un campo debe cambiarse" });
      }

      const data = {};
      if (name !== undefined) data.name = name;  
      if (email !== undefined) data.email = email;
      if (password) {
        data.password = await bcrypt.hash(password, 10);
      }

      const usuario = await prisma.usuario.update({
        where: { id },
        data,
        select: { id: true, name: true, email: true, creation_date: true }  
      });

      res.json(usuario);
    } catch (err) {
      console.error("Error en actualizarUsuario:", err);
      if (err.code === 'P2002') {
        res.status(400).json({ error: "Email ya está en uso" });
      } else {
        res.status(400).json({ error: "No se pudo actualizar el usuario" });
      }
    }
  },

  /**
   * Elimina un usuario específico por ID.
   * Esta función está protegida (requiere middleware de autenticación JWT y que el usuario sea el propietario).
   * 
   * @param {Object} req - Objeto de solicitud de Express (incluye req.user del middleware).
   * @param {string} req.params.id - ID del usuario a eliminar.
   * @param {Object} res - Objeto de respuesta de Express.
   * @returns {Promise<void>} - Responde con un mensaje de éxito o un error de permisos.
   * @throws {Error} - Errores de Prisma o validación de permisos.
   */
  eliminarUsuario: async (req, res) => {
    const { id } = req.params;
    
    // Verificar auth
    if (!req.user || id !== req.user.sub) {
      return res.status(403).json({ error: "No tienes permiso para eliminar este usuario" });
    }

    try {
      await prisma.usuario.delete({ where: { id } });
      res.json({ message: "Usuario eliminado correctamente" });
    } catch (err) {
      console.error("Error en eliminarUsuario:", err);
      res.status(400).json({ error: "No se pudo eliminar el usuario" });
    }
  }
};
