/** A real, isolated history/URL encoder without navigating the test runner's page. */
export async function createTestWindow(pathname: string) {
  const frame = document.createElement("iframe");
  frame.hidden = true;
  const loaded = new Promise<void>((resolve, reject) => {
    frame.onload = () => resolve();
    frame.onerror = () => reject(new Error("Could not load isolated history document"));
  });
  frame.src = "/src/lib/__tests__/fixtures/browser-window.html";
  document.body.append(frame);
  try {
    await loaded;
    const testWindow = frame.contentWindow!;
    testWindow.history.replaceState(null, "", pathname);
    return { window: testWindow, dispose: () => frame.remove() };
  } catch (error) {
    frame.remove();
    throw error;
  }
}
