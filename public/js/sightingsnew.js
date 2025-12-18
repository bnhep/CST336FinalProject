document.addEventListener('DOMContentLoaded', () => {
    const locationSelect = document.getElementById('location');
    if (!locationSelect) return;

    async function loadStates() {
        try {
            // Show loading option
            locationSelect.innerHTML = '<option value="">Loading states...</option>';

            const resp = await fetch('https://csumb.space/api/allStatesAPI.php');
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}`);
            }

            const data = await resp.json();

            // Reset with prompt
            locationSelect.innerHTML = '<option value="">Select a state...</option>';

            // Add states from API
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

            // ---- NEW: Auto-select the correct state on EDIT page ----
            const selected = locationSelect.dataset.selected;
            if (selected) {
                locationSelect.value = selected;
            }
        } catch (err) {
            console.error('Error loading states:', err);
            locationSelect.innerHTML =
                '<option value="">Failed to load states</option>';
        }
    }

    loadStates();
});
