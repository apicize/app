import { Identifiable } from "./identifiable";
import { Named } from "./named";
import { ValidationErrors } from "./validation";

export interface Proxy extends Identifiable, Named, ValidationErrors {
    url: string
}
