import type { Request, Response } from 'express';

import {
  listarNoticias,
  obtenerNoticiaPorId,
} from '../services/noticias.service';
import {
  validarBusqueda,
  validarCategoria,
  validarId,
} from '../validators/noticias.validator';

export const obtenerNoticias = (
  req: Request,
  res: Response
): void => {
  const categoria = validarCategoria(req.query.categoria);

  if (!categoria.ok) {
    res
      .status(400)
      .json({ status: 'error', message: categoria.message });
    return;
  }

  const busqueda = validarBusqueda(req.query.q);

  if (!busqueda.ok) {
    res
      .status(400)
      .json({ status: 'error', message: busqueda.message });
    return;
  }

  const noticias = listarNoticias(categoria.valor, busqueda.valor);

  res.status(200).json({
    status: 'ok',
    total: noticias.length,
    filtros: {
      categoria: categoria.valor,
      q: busqueda.valor,
    },
    noticias,
  });
};

export const obtenerNoticia = (
  req: Request,
  res: Response
): void => {
  const id = validarId(req.params.id);

  if (!id.ok) {
    res
      .status(400)
      .json({ status: 'error', message: id.message });
    return;
  }

  const noticia = obtenerNoticiaPorId(id.valor);

  if (!noticia) {
    res.status(404).json({
      status: 'error',
      message: 'Noticia no encontrada',
    });
    return;
  }

  res.status(200).json({ status: 'ok', noticia });
};
