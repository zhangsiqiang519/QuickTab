## ADDED Requirements

### Requirement: Safari import bridge result type is consistent
The preload bridge SHALL declare the Safari import API return type using the same result shape that the main process returns and the renderer consumes.

#### Scenario: Successful Safari import result
- **WHEN** the renderer calls the Safari import bridge API and the main process returns a successful result object
- **THEN** TypeScript accepts renderer access to success fields such as `ok` and `count`

#### Scenario: Failed Safari import result
- **WHEN** the renderer calls the Safari import bridge API and the main process returns a failed result object
- **THEN** TypeScript accepts renderer access to failure fields such as `ok`, `message`, and `userMessage`

### Requirement: Bridge declarations match preload implementation
The system SHALL keep `window.quicktab` declarations aligned with the preload implementation for the Safari import API.

#### Scenario: Typecheck validates bridge contract
- **WHEN** the project typecheck runs
- **THEN** the preload implementation, window declaration, and renderer usage compile without bridge return-type mismatch
