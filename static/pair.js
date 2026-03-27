const status = document.getElementById('status');
document.getElementById('pair').addEventListener('click', async () => {
  try {
    const [device] = await navigator.hid.requestDevice({
      filters: [{ usagePage: 0xFF60, usage: 0x61 }]
    });
    if (device) {
      status.textContent = 'Paired: ' + (device.productName || 'Unknown keyboard') + '. You can close this tab.';
    } else {
      status.textContent = 'No device selected.';
    }
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
  }
});
