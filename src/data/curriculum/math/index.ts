import { curriculumData } from '../../curriculumData';
import { standardsData } from '../../standards';
import type { CurriculumIndicatorRecord } from '../types';
import {
  convertLegacyIndicators,
  convertStandardsDataIndicators,
  mathStrandFromStandard,
} from '../utils';
import { MATH_STANDARD_DESCRIPTIONS } from './standards';

const primaryMath = curriculumData.filter((item) => item.subject === 'คณิตศาสตร์');
const secondaryMath = standardsData.find((item) => item.name === 'คณิตศาสตร์');

const primaryRows = convertLegacyIndicators(primaryMath, 'math', mathStrandFromStandard);
const secondaryRows = secondaryMath
  ? convertStandardsDataIndicators(
      secondaryMath,
      'คณิตศาสตร์',
      'math-m',
      mathStrandFromStandard,
      MATH_STANDARD_DESCRIPTIONS,
    )
  : [];

/** รวมข้อมูลคณิตศาสตร์ทุกระดับชั้นที่มีในระบบ */
export const mathCurriculum: CurriculumIndicatorRecord[] = [...primaryRows, ...secondaryRows];

export { MATH_STANDARD_DESCRIPTIONS } from './standards';
