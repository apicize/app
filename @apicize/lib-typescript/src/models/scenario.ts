import { Identifiable } from "./identifiable";
import { Named } from "./named";
import { Variable } from "./variable";

export interface Scenario extends Identifiable, Named {
    variables?: Variable[]
}
