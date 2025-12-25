
import { ChecklistItem, Contractor } from './types';

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  // SECCIÓN 1
  { id: 's1_1', section: 1, label: 'Hoja de vida SIGEP II firmada', description: 'Con soportes de formación y experiencia cargados.' },
  { id: 's1_2', section: 1, label: 'Copia de la cédula de ciudadanía / ID legible' },
  { id: 's1_3', section: 1, label: 'Certificación bancaria y RUT en firme', description: 'En un solo archivo.' },
  { id: 's1_4', section: 1, label: 'Certificado de examen médico preocupacional' },
  { id: 's1_5', section: 1, label: 'A5-PL-6 Autorización consulta inhabilidades (Menores)', description: 'Solo si aplica.' },
  
  // SECCIÓN 2
  { id: 's2_1', section: 2, label: 'Memorando de solicitud' },
  { id: 's2_2', section: 2, label: 'Estudios previos - Plantilla A5-PL-4', description: 'Firmado por jefe de dependencia y ordenador del gasto.' },
  { id: 's2_3', section: 2, label: 'Certificado de Disponibilidad Presupuestal (CDP)' },
  { id: 's2_4', section: 2, label: 'Certificación de inexistencia de personal de planta' },
  { id: 's2_5', section: 2, label: 'Autorización de objetos iguales - Plantilla A5-PL-3', description: 'Si aplica.' },
  { id: 's2_6', section: 2, label: 'Certificado antecedentes Procuraduría' },
  { id: 's2_7', section: 2, label: 'Certificado antecedentes fiscales Contraloría' },
  { id: 's2_8', section: 2, label: 'Certificado Antecedentes Judiciales' },
  { id: 's2_9', section: 2, label: 'Certificado Registro Medidas Correctivas' },
  { id: 's2_10', section: 2, label: 'Certificado Antecedentes REDAM (Alimentos)' },
  { id: 's2_11', section: 2, label: 'Certificado Antecedentes Prof. y Tarjeta Profesional' },
  { id: 's2_12', section: 2, label: 'Libreta militar / Situación definida', description: 'Varones menores de 50 años.' },
  { id: 's2_13', section: 2, label: 'Certificado afiliación Salud y Pensión', description: 'Activos, en un solo archivo.' },
  { id: 's2_14', section: 2, label: 'A5-FO-09 Certificado de Idoneidad', description: 'Con soportes SIGEP y TP.' },
  { id: 's2_15', section: 2, label: 'Certificación ordenador del gasto - A5-PL-2', description: 'Si aplica.' }
];

export const CONTRACTOR_NAMES = [
  "LUISA FERNANDA MALDONADO MORALES", "CESAR FERNANDO GARCIA LLANO", "NATALIA DEL PILAR CAMARGO OVALLE",
  "LUZ AYDA CASTRO TRIANA", "ILIANA ALZATE TIJERINO", "DIEGO MAURICIO MURILLO MARIN",
  "DIANA MARITZA GUZMAN DOMINGUEZ", "CLAUDINE URBANO CELORIO", "ROCIO ANDREA BARRERO RAMIREZ",
  "HEIMUNTH ALEXANDER DUARTE CUBILLOS", "DANIEL AUGUSTO RINCON PUERTA", "CLAUDIA DEL PILAR ROJAS PEREZ",
  "MARIA CAROLINA DUARTE TRIVIÑO", "JOHANA MILENA VALBUENA VELANDIA", "LIA MARIA VILLALBA CORTES",
  "CHRISTIAN ALFONSO PIMIENTO ORDOÑEZ", "DAIRA EMILCE RECALDE RODRIGUEZ", "BETSY BIBIANA RODRIGUEZ CABEZA",
  "DENISSE CASTRO ROA", "NESTOR RAUL ESPEJO DELGADO", "ILYA GERLANDINE PALACIOS GONZALEZ",
  "CARLOS ARMANDO ROSERO RODRIGUEZ", "IVAN HERNANDO CAICEDO RUBIANO", "CLAUDIA ROCIO PERILLA MOLANO",
  "XIMENA CAROLINA CUBILLOS VARGAS", "VIVIANA MORENO QUINTERO", "LUISA PALOMINO MORERA",
  "JULIA HELENA HERRERA RIVERA", "JOHANNA MARIA PUENTES AGUILAR", "OCTAVIO SEGUNDO ERASO PAGUAY",
  "EDGAR ROBERTO UNRIZA PINZON", "ANDRES FELIPE OYOLA VERGEL", "ERIKA DAYANA HERNANDEZ ALDANA",
  "SANDRA MILENA AYA ROJAS", "LILIANA VANESSA CELIS GIL", "JUAN CARLOS ARIAS GARCIA",
  "DENY CAROLINA LARA VELASQUEZ", "IVAN DARIO PINTO SARMIENTO", "EDGAR CAMILO PIRAJAN PRIETO",
  "IRENE ACONCHA ABRIL", "RODIN ANDRES ARENAS ROMERO"
];

export const CONTRACTORS: Contractor[] = CONTRACTOR_NAMES.map(name => ({
  id: name.replace(/\s+/g, '_').toLowerCase(),
  name: name
}));
