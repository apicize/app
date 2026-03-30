import { Identifiable } from "./identifiable";
import { Named } from "./named";
import { ParameterCipher } from "./parameter-cipher";
import { ValidationErrors } from "./validation";
import { Variable } from "./variable";

export type Scenario = ParameterCipher | ScenarioPlain

export interface ScenarioPlain extends Identifiable, Named, ValidationErrors {
    variables?: Variable[]
}
