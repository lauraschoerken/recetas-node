/**
 * Agrega todos los arrays de ingredientes de todos los archivos de categoría.
 * Importa `allIngredients` para obtener la lista completa.
 */
import { IngredientSeedData } from '../types';

export { verduras }        from './01-verduras';
export { frutas }          from './02-frutas';
export { carnes }          from './03-carnes';
export { pescadosMariscos } from './04-pescados-mariscos';
export { lacteosHuevos }   from './05-lacteos-huevos';
export { cerealesHarinas } from './06-cereales-harinas';
export { legumbres }       from './07-legumbres';
export { frutosSemillas }  from './08-frutos-secos-semillas';
export { aceitesGrasas }   from './09-aceites-grasas';
export { condimentosEspecias } from './10-condimentos-especias';
export { salsasCaldos }    from './11-salsas-caldos';
export { bebidas }         from './12-bebidas';

import { verduras }        from './01-verduras';
import { frutas }          from './02-frutas';
import { carnes }          from './03-carnes';
import { pescadosMariscos } from './04-pescados-mariscos';
import { lacteosHuevos }   from './05-lacteos-huevos';
import { cerealesHarinas } from './06-cereales-harinas';
import { legumbres }       from './07-legumbres';
import { frutosSemillas }  from './08-frutos-secos-semillas';
import { aceitesGrasas }   from './09-aceites-grasas';
import { condimentosEspecias } from './10-condimentos-especias';
import { salsasCaldos }    from './11-salsas-caldos';
import { bebidas }         from './12-bebidas';

export const allIngredients: IngredientSeedData[] = [
  ...verduras,
  ...frutas,
  ...carnes,
  ...pescadosMariscos,
  ...lacteosHuevos,
  ...cerealesHarinas,
  ...legumbres,
  ...frutosSemillas,
  ...aceitesGrasas,
  ...condimentosEspecias,
  ...salsasCaldos,
  ...bebidas,
];
