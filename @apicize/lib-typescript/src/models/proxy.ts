import { Identifiable } from "./identifiable";
import { Named } from "./named";

export interface Proxy extends Identifiable, Named {
    url: string
}
