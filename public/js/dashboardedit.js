//eventlisteners
document.addEventListener('DOMContentLoaded', () => {
    cryptidDropdown();
    locationDropdown();
});

//functions
async function cryptidDropdown() {
    let cryptidSelect = document.getElementById('cryptid_id');
    if (!cryptidSelect) return;

    let currentCryptidId = cryptidSelect.dataset.current;

    try {
    let url = '/api/cryptids';
    let res = await fetch(url);
    let cryptids = await res.json();

    cryptids.forEach(cryptid => {
        const option = document.createElement('option');
        option.value = cryptid.cryptid_id;
        option.textContent = `(ID:${cryptid.cryptid_id}) `;
        option.textContent += cryptid.name;
        if (String(cryptid.cryptid_id) === currentCryptidId) {
            option.selected = true;
        }
        cryptidSelect.appendChild(option);
    });

    } catch (err) {
        console.error('Error fetching cryptids:', err);
        if (currentCryptidId) {
            const option = document.createElement('option');
            option.value = currentCryptidId;
            option.textContent = `Current Cryptid (${currentCryptidId})`;
            option.selected = true;
            cryptidSelect.appendChild(option);
        }
    }
}

async function locationDropdown() {
    const locationSelect = document.getElementById('location_name');
    if (!locationSelect) return;

    try {
        locationSelect.innerHTML = '<option value="">Loading states...</option>';

        const resp = await fetch('https://csumb.space/api/allStatesAPI.php');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const data = await resp.json();

        locationSelect.innerHTML = '<option value="">All locations</option>';

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

        const preselected = locationSelect.dataset.current;
        if (preselected) {
            Array.from(locationSelect.options).forEach(opt => {
            if (opt.value === preselected) {
                opt.selected = true;
            }
            });
        }
    } catch (err) {
    console.error('Error loading states:', err);
    locationSelect.innerHTML = '<option value="">Failed to load states</option>';
    }
}



