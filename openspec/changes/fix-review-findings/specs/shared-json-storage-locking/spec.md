## ADDED Requirements

### Requirement: JSON storage locks have ownership
The system SHALL associate each shared JSON storage lock with an owner token and SHALL release only locks held by the current owner.

#### Scenario: Current owner releases lock
- **WHEN** a writer completes an update while still owning the storage lock
- **THEN** the lock is removed and other writers can proceed

#### Scenario: Non-owner cannot release lock
- **WHEN** a writer observes a lock owned by another active writer
- **THEN** it does not remove that lock as part of normal release

### Requirement: Stale lock handling is conservative
The system SHALL treat a storage lock as stale only after the configured stale threshold and SHALL avoid deleting fresh locks owned by another writer.

#### Scenario: Fresh lock is preserved
- **WHEN** a writer attempts to acquire a lock that is newer than the stale threshold
- **THEN** it waits or retries without deleting the lock

#### Scenario: Stale lock can be recovered
- **WHEN** a writer attempts to acquire a lock older than the stale threshold
- **THEN** it can replace the stale lock and continue the JSON update
