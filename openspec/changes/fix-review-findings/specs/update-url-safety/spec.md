## ADDED Requirements

### Requirement: Update links are validated before opening
The system SHALL validate update-related external URLs in the main process before calling the operating system to open them.

#### Scenario: Allowed release URL opens
- **WHEN** the renderer requests opening an update URL whose scheme and host match the configured update allowlist
- **THEN** the main process opens the URL with the system browser

#### Scenario: Disallowed update URL is rejected
- **WHEN** the renderer requests opening an update URL whose scheme or host is not allowed
- **THEN** the main process rejects the request and does not call the operating system open operation

### Requirement: Update metadata preserves only trusted URLs
The system SHALL accept release and asset URLs from update metadata only when they match the update URL allowlist.

#### Scenario: Untrusted release metadata URL
- **WHEN** update metadata contains a release page or asset URL outside the allowlist
- **THEN** the update status excludes that URL from openable update actions
