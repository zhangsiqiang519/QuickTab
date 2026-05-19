export async function openUrlInFocusedWindow(chromeApi, url) {
  const targetWindow = await chromeApi.windows.getLastFocused({
    populate: false,
    windowTypes: ["normal"]
  });

  if (targetWindow?.id) {
    await chromeApi.windows.update(targetWindow.id, { focused: true });
    await chromeApi.tabs.create({ windowId: targetWindow.id, url, active: true });
    await chromeApi.windows.update(targetWindow.id, { focused: true });
    return;
  }

  await chromeApi.tabs.create({ url, active: true });
}
