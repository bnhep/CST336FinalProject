document.addEventListener('DOMContentLoaded', function () {
  //search option blocks
  const modeSelect = document.getElementById('mode');
  const cryptidBlock = document.querySelector('.filter-cryptid');
  const locationBlock = document.querySelector('.filter-location');
  const mineBlock = document.querySelector('.filter-mine');

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
  }

  if (modeSelect) {
    modeSelect.addEventListener('change', updateModeBlocks);
    updateModeBlocks(); //match current selection
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
});