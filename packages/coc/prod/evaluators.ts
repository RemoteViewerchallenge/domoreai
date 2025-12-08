// Lightweight prod evaluator wrapper: reuses mock evaluator but you can swap in a real evaluator later.
import { Evaluator as MockEvaluator } from '../evaluator';
export default class ProdEvaluator extends MockEvaluator {}