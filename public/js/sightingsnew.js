document.addEventListener('DOMContentLoaded', () => {
  const locationSelect = document.getElementById('location');
  if (!locationSelect) return;

  async function loadStates() {
    try {
      //loading option
      locationSelect.innerHTML = '<option value="">Loading states...</option>';

      const resp = await fetch('https://csumb.space/api/allStatesAPI.php');
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const data = await resp.json();

      //default prompt
      locationSelect.innerHTML = '<option value="">Select a state...</option>';

      //api handling
      data.forEach(item => {
        const name =
          item.name ||
          item.state ||
          item.State ||
          item.abbreviation ||
          item.code ||
          item;

        if (!name) return;

        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        locationSelect.appendChild(opt);
      });
    } catch (err) {
      console.error('Error loading states:', err);
      locationSelect.innerHTML =
        '<option value="">Failed to load states</option>';
    }
  }

  loadStates();
});