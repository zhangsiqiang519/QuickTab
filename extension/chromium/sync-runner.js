export function createInitialSyncRunner(syncAll) {
  let inFlight;
  let completed = false;

  return function runInitialSync() {
    if (completed) return Promise.resolve(false);
    if (inFlight) return inFlight;

    inFlight = Promise.resolve()
      .then(syncAll)
      .then(() => {
        completed = true;
        return true;
      })
      .finally(() => {
        inFlight = undefined;
      });

    return inFlight;
  };
}
