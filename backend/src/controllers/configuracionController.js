import { Configuracion } from '../models/index.js';
import { registrarAudit } from '../services/auditService.js';

// GET /configuracion
export const listar = async (req, res) => {
  try {
    const configs = await Configuracion.findAll({ order: [['clave', 'ASC']] });

    // Sanitizar: no devolver claves de API completas
    const sanitized = configs.map(c => {
      const valor = { ...c.valor };
      if (valor.openai_api_key) valor.openai_api_key = valor.openai_api_key ? '***configurada***' : '';
      if (valor.gemini_api_key) valor.gemini_api_key = valor.gemini_api_key ? '***configurada***' : '';
      return { ...c.toJSON(), valor };
    });

    res.json({ success: true, data: sanitized });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /configuracion/:clave
export const obtener = async (req, res) => {
  try {
    const config = await Configuracion.findOne({ where: { clave: req.params.clave } });
    if (!config) return res.status(404).json({ success: false, message: 'Configuracion no encontrada' });

    const valor = { ...config.valor };
    if (valor.openai_api_key) valor.openai_api_key = valor.openai_api_key ? '***configurada***' : '';
    if (valor.gemini_api_key) valor.gemini_api_key = valor.gemini_api_key ? '***configurada***' : '';

    res.json({ success: true, data: { ...config.toJSON(), valor } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /configuracion/:clave
export const actualizar = async (req, res) => {
  try {
    const { valor } = req.body;
    if (!valor || typeof valor !== 'object') {
      return res.status(400).json({ success: false, message: 'valor (objeto) es requerido' });
    }

    let config = await Configuracion.findOne({ where: { clave: req.params.clave } });

    if (!config) {
      config = await Configuracion.create({
        clave: req.params.clave,
        valor,
        descripcion: req.body.descripcion || null,
      });
    } else {
      // Merge: si un campo viene como '***configurada***' o undefined, no lo sobreescribir
      const merged = { ...config.valor };
      for (const [k, v] of Object.entries(valor)) {
        if (v === '***configurada***' || v === undefined) continue;
        if (v === '') {
          merged[k] = ''; // Borrar la clave
        } else {
          merged[k] = v;
        }
      }

      await config.update({ valor: merged, actualizado_en: new Date() });
    }

    registrarAudit({ req, accion: 'EDITAR_CONFIGURACION', entidad: 'configuraciones', entidad_id: config.id, despues: { clave: req.params.clave } });

    // Devolver sanitizado
    const respValor = { ...config.valor };
    if (respValor.openai_api_key) respValor.openai_api_key = '***configurada***';
    if (respValor.gemini_api_key) respValor.gemini_api_key = '***configurada***';

    res.json({ success: true, data: { ...config.toJSON(), valor: respValor } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
