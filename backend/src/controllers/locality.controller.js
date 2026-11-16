import { Locality } from '../models/locality.model.js';
import { countryCatalog } from '../helpers/country.helper.js';

// GET /origin-localities: localidades censales de Argentina para el registro.
export const getLocalities = async (req, res) => {
  const localities = await Locality.findAll({
    attributes: ['id', 'name', 'provinceCode', 'provinceName', 'departmentName', 'departmentCode'],
    order: [['name', 'ASC'], ['id', 'ASC']],
  });
  res.json({ data: localities, meta: { country: 'Argentina', scope: 'localidades censales', source: 'Georef' } });
};

// GET /origin-countries: países y territorios (ISO 3166-1) para quien no es de Argentina.
export const getCountries = async (req, res) => {
  res.json({ data: countryCatalog.countries, meta: { standard: countryCatalog.standard } });
};
