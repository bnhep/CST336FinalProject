document.addEventListener('DOMContentLoaded', function () {
  //search option blocks
  const modeSelect = document.getElementById('mode');
  const cryptidBlock = document.querySelector('.filter-cryptid');
  const locationBlock = document.querySelector('.filter-location');
  const mineBlock = document.querySelector('.filter-mine');
  const locationSelect = document.getElementById('location');

  function updateModeBlocks() {
    if (!modeSelect) return;

    const mode = modeSelect.value;

    if (cryptidBlock) {
      cryptidBlock.classList.toggle('d-none', mode !== 'cryptid');
    }
    if (locationBlock) {
      locationBlock.classList.toggle('d-none', mode !== 'location');
    }
    if (mineBlock) {
      mineBlock.classList.toggle('d-none', mode !== 'mine');
    }

    if (locationSelect) {
      locationSelect.required = (mode === 'location');
    }
  }

  if (modeSelect) {
    modeSelect.addEventListener('change', updateModeBlocks);
    updateModeBlocks();
  }

  //newest/oldest toggle
  const orderInput = document.getElementById('orderInput');
  const orderToggle = document.getElementById('orderToggle');

  if (orderInput && orderToggle) {
    function updateOrderButtonLabel() {
      const value = orderInput.value === 'oldest' ? 'oldest' : 'newest';
      if (value === 'oldest') {
        orderToggle.textContent = 'Oldest to Newest';
      } else {
        orderToggle.textContent = 'Newest to Oldest';
      }
    }

    orderToggle.addEventListener('click', () => {
      const current = orderInput.value === 'oldest' ? 'oldest' : 'newest';
      const next = current === 'newest' ? 'oldest' : 'newest';
      orderInput.value = next;
      updateOrderButtonLabel();
    });

    updateOrderButtonLabel();
  }

  //load US states for the location dropdown
  async function loadStatesForDropdown() {
    if (!locationSelect) return;

    try {
      locationSelect.innerHTML = '<option value="">Loading states...</option>';

      const resp = await fetch('https://csumb.space/api/allStatesAPI.php');
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const data = await resp.json();

      //default option
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

      const preselected = locationSelect.dataset.selected;
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

  loadStatesForDropdown();
});
