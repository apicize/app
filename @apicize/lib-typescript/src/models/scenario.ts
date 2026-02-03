import { Identifiable } from "./identifiable";
import { Named } from "./named";
import { ValidationErrors } from "./validation";
import { Variable } from "./variable";

export interface Scenario extends Identifiable, Named, ValidationErrors {
    variables?: Variable[]
}
