async function loadCryptids() {
  try {
    const res = await fetch('/api/cryptids');
    const cryptids = await res.json();

    const grid = document.getElementById('cryptidGrid');
    grid.innerHTML = '';

    if (!cryptids.length) {
      grid.innerHTML = '<p class="text-muted">No cryptids found.</p>';
      return;
    }

    cryptids.forEach(c => {
      const col = document.createElement('div');
      col.className = 'col-md-6 col-lg-4';

      col.innerHTML = `
        <article class="forest-card cryptid-card h-100">
          <h2 class="cryptid-name">${c.name}</h2>
          <p class="cryptid-region">${c.original_region || 'Unknown region'}</p>
          <p class="cryptid-blurb">
            ${c.description || 'No description available.'}
          </p>
          <div class="cryptid-actions">
            <a href="/cryptid/${c.cryptid_id}" class="btn btn-ghost btn-sm">
              Learn More
            </a>
          </div>
        </article>
      `;

      grid.appendChild(col);
    });
  } catch (err) {
    console.error(err);
    document.getElementById('cryptidGrid').innerHTML =
      '<p class="text-danger">Failed to load cryptids.</p>';
  }
}

document.addEventListener('DOMContentLoaded', loadCryptids);
