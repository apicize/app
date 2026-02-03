import { RequestUpdate } from "./request-update";
import { RequestGroupUpdate } from "./request-group-update";
import { ScenarioUpdate } from "./scenario-update";
import { AuthorizationUpdate } from "./authorization-update";
import { CertificateUpdate } from "./certificate-update";
import { ProxyUpdate } from "./proxy-update";
import { DataSetUpdate } from "./data-set-update";
import { DefaultsUpdate } from "./defaults-update";

export type EntityUpdate = RequestUpdate | RequestGroupUpdate |
    ScenarioUpdate | AuthorizationUpdate |
    CertificateUpdate | ProxyUpdate | DataSetUpdate | DefaultsUpdate