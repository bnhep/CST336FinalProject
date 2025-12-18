document.addEventListener('DOMContentLoaded', () => {
    const modalEl = document.getElementById('cryptidDetailModal');
    if (!modalEl) return;

    const bootstrapModal = window.bootstrap
        ? new bootstrap.Modal(modalEl)
        : null;

    const titleEl = document.getElementById('cryptidModalTitle');
    const imgEl = document.getElementById('cryptidModalImage');
    const noImgEl = document.getElementById('cryptidModalNoImage');
    const descEl = document.getElementById('cryptidModalDescription');
    const origEl = document.getElementById('cryptidModalOriginalRegion');
    const knownEl = document.getElementById('cryptidModalKnownRegions');
    const baseDangerEl = document.getElementById('cryptidModalBaseDanger');
    const avgDangerEl = document.getElementById('cryptidModalAvgDanger');
    const logLinkEl = document.getElementById('cryptidModalLogSighting');
    const sightingCountEl = document.getElementById('cryptidModalSightingCount');

    function setText(el, value, fallback) {
        if (!el) return;
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            el.textContent = value;
        } else {
            el.textContent = fallback || '';
        }
    }

    function showLoadingState() {
        setText(titleEl, 'Loading...', '');
        setText(descEl, 'Loading details...', '');
        setText(origEl, '', '');
        setText(knownEl, '', '');
        setText(baseDangerEl, '', '');
        setText(avgDangerEl, '', '');
        setText(sightingCountEl, '', '');

        if (imgEl) {
            imgEl.classList.add('d-none');
            imgEl.src = '';
        }
        
        if (noImgEl) {
            noImgEl.classList.remove('d-none');
            noImgEl.textContent = 'Loading image...';
        }
    }

    async function loadCryptidDetails(id) {
        try {
            showLoadingState();

            if (bootstrapModal) {
                bootstrapModal.show();
            }

            const resp = await fetch(`/api/cryptids/${id}`);
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}`);
            }

            const c = await resp.json();

            setText(titleEl, c.name, 'Unknown cryptid');
            setText(descEl, c.description, 'No description available.');
            setText(origEl, c.original_region, 'Unknown');
            setText(knownEl, c.known_regions, 'No regions recorded yet.');

            //base danger
            if (baseDangerEl) {
                if (c.danger_level !== null && c.danger_level !== undefined) {
                    baseDangerEl.textContent = `${c.danger_level} / 5`;
                } else {
                    baseDangerEl.textContent = 'N/A';
                }
            }

            //average danger from sightings
            if (avgDangerEl) {
                if (c.avg_sighting_danger !== null && c.avg_sighting_danger !== undefined) {
                    const n = Number(c.avg_sighting_danger);
                    const label = isNaN(n) ? c.avg_sighting_danger : n.toFixed(1);
                    avgDangerEl.textContent = `${label} / 5`;
                } else {
                    avgDangerEl.textContent = 'N/A';
                }
            }

            //sighting count
            if (sightingCountEl) {
                const count = c.sighting_count;

                if (count !== null && count !== undefined) {
                    if (Number(count) === 0) {
                        sightingCountEl.textContent = 'No sightings recorded yet.';
                    } else {
                        sightingCountEl.textContent = `${count}`;
                    }
                } else {
                    sightingCountEl.textContent = 'No sightings recorded yet.';
                }
            }

            //image
            if (c.image_url && imgEl) {
                imgEl.src = c.image_url;
                imgEl.alt = c.name || 'Cryptid image';
                imgEl.classList.remove('d-none');
                if (noImgEl) noImgEl.classList.add('d-none');
            } else {
                if (imgEl) {
                    imgEl.classList.add('d-none');
                    imgEl.src = '';
                }
                if (noImgEl) {
                    noImgEl.classList.remove('d-none');
                    noImgEl.textContent = 'No image available.';
                }
            }

            //update log sighting link
            if (logLinkEl) {
                logLinkEl.href = `/sightings/new?cryptid_id=${encodeURIComponent(id)}`;
            }
        } catch (err) {
            console.error('Error loading cryptid details:', err);
            setText(descEl, 'Unable to load cryptid details right now.', '');
            if (baseDangerEl) baseDangerEl.textContent = 'N/A';
            if (avgDangerEl) avgDangerEl.textContent = 'N/A';

            if (noImgEl) {
                noImgEl.classList.remove('d-none');
                noImgEl.textContent = 'Error loading image.';
            }

            if (bootstrapModal) {
                bootstrapModal.show();
            }
        }
    }

    //click handlers for cards buttons
    document.querySelectorAll('.cryptid-card').forEach(card => {
        const id = card.dataset.cryptidId;
        if (!id) return;

        //clicking the card
        card.addEventListener('click', (e) => {
            //if clicking the seen link
            if (e.target.closest('a')) {
                return;
            }
            loadCryptidDetails(id);
        });

        //clicking the learn more
        const learnBtn = card.querySelector('.js-learn-more');
        if (learnBtn) {
            learnBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                loadCryptidDetails(id);
            });
        }
    });
});