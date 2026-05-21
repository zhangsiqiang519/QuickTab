## ADDED Requirements

### Requirement: Initial extension sync is deduplicated
The browser extension SHALL avoid running more than one full initial synchronization at the same time during startup and native-host handshake.

#### Scenario: Startup sync overlaps handshake acknowledgement
- **WHEN** extension startup has already started a full sync and a native-host handshake acknowledgement arrives
- **THEN** the extension does not start a second full sync concurrently

#### Scenario: Handshake triggers sync after no startup sync
- **WHEN** no full initial sync is running or completed and a native-host handshake acknowledgement arrives
- **THEN** the extension starts one full sync

### Requirement: Incremental events remain active
The browser extension SHALL continue sending tab, bookmark, and history incremental events after initial sync deduplication.

#### Scenario: Tab update after initial sync
- **WHEN** a browser tab changes after the initial sync guard is set
- **THEN** the extension sends the corresponding tab event to the native host
