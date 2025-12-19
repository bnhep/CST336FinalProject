document.addEventListener('DOMContentLoaded', () => {
    const locationSelect = document.getElementById('location');
    if (!locationSelect) return;

    async function loadStates() {
        try {
            //show loading
            locationSelect.innerHTML = '<option value="">Loading states...</option>';

            const resp = await fetch('https://csumb.space/api/allStatesAPI.php');
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}`);
            }

            const data = await resp.json();

            //reset
            locationSelect.innerHTML = '<option value="">Select a state...</option>';

            //add states from api
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

            // select the correct state on edit page
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
