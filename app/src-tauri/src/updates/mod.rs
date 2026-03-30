use serde::{Deserialize, Serialize};

pub mod authorization_update;
pub mod certificate_update;
pub mod data_set_update;
pub mod defaults_update;
pub mod proxy_update;
pub mod request_group_update;
pub mod request_update;
pub mod scenario_update;

pub use authorization_update::*;
pub use certificate_update::*;
pub use data_set_update::*;
pub use defaults_update::*;
pub use proxy_update::*;
pub use request_group_update::*;
pub use request_update::*;
pub use scenario_update::*;

#[derive(Serialize, Deserialize, PartialEq, Clone)]
#[serde(tag = "type")]
pub enum EntityUpdate {
    Request(RequestUpdate),
    RequestGroup(RequestGroupUpdate),
    Scenario(ScenarioUpdate),
    Authorization(AuthorizationUpdate),
    Certificate(CertificateUpdate),
    Proxy(ProxyUpdate),
    DataSet(DataSetUpdate),
    Defaults(DefaultsUpdate),
}

