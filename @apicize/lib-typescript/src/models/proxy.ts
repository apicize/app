import { Identifiable } from "./identifiable";
import { Named } from "./named";
import { ParameterCipher } from "./parameter-cipher";
import { ValidationErrors } from "./validation";

export type Proxy = ParameterCipher | ProxyPlain

export interface ProxyPlain extends Identifiable, Named, ValidationErrors {
    url: string
}
