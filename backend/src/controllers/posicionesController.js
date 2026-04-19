import { TablaPosiciones, TablaPosicionesClub, Club, Institucion, Categoria, Zona } from '../models/index.js';
import { recalcularPosiciones } from '../services/standingsCalculatorService.js';

// GET /posiciones/:torneoId/categorias
export const porCategoria = async (req, res) => {
  try {
    const { categoria_id, zona_id } = req.query;
    const where = { torneo_id: parseInt(req.params.torneoId) };
    if (categoria_id) where.categoria_id = categoria_id;
    if (zona_id) where.zona_id = zona_id;

    const posiciones = await TablaPosiciones.findAll({
      where,
      include: [
        { model: Club, as: 'club', attributes: ['id', 'sufijo', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario', 'color_secundario'], include: [{ model: Institucion, as: 'institucion' }] },
        { model: Categoria, as: 'categoria', attributes: ['id', 'sufijo', 'nombre', 'anio_nacimiento', 'es_preliminar'] },
        { model: Zona, as: 'zona', attributes: ['id', 'sufijo', 'nombre', 'color'] },
      ],
      order: [['puntos', 'DESC'], ['dg', 'DESC'], ['gf', 'DESC']],
    });

    res.json({ success: true, data: posiciones });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /posiciones/:torneoId/general
export const general = async (req, res) => {
  try {
    const { zona_id } = req.query;
    const where = { torneo_id: parseInt(req.params.torneoId) };
    if (zona_id) where.zona_id = zona_id;

    const posiciones = await TablaPosicionesClub.findAll({
      where,
      include: [
        { model: Club, as: 'club', attributes: ['id', 'sufijo', 'nombre', 'nombre_corto', 'escudo_url', 'color_primario', 'color_secundario'], include: [{ model: Institucion, as: 'institucion' }] },
        { model: Zona, as: 'zona', attributes: ['id', 'sufijo', 'nombre', 'color'] },
      ],
      order: [['puntos_totales', 'DESC']],
    });

    res.json({ success: true, data: posiciones });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /posiciones/:torneoId/recalcular
export const recalcular = async (req, res) => {
  try {
    const resultado = await recalcularPosiciones(parseInt(req.params.torneoId));
    res.json({
      success: true,
      data: resultado,
      message: `Posiciones recalculadas: ${resultado.posiciones_por_categoria} por categoria, ${resultado.posiciones_club} generales`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
