//addevent listeners
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadAvatars();
        attachAvatarListeners();
    } catch (err) {
        console.error('Error initializing avatar carousel:', err);
    }
});

//functions
async function loadAvatars() {
    try {
        let url = '/api/avatars';
        let res = await fetch(url);
        let avatars = await res.json();

        let carouselInner = document.querySelector('#avatarCarousel .carousel-inner');
        carouselInner.innerHTML = '';

        avatars.forEach((avatar, index) => {
            let item = document.createElement('div');
            item.className = `carousel-item ${index === 0 ? 'active' : ''}`;
            item.innerHTML = `<img src="${avatar.url}" 
                                alt="${avatar.filename}" 
                                class="rounded-circle avatar-choice mx-auto d-block" 
                                style="width:250px;height:250px;" 
                                data-avatar="${avatar.url}">
                                <p class="text-center">${avatar.filename.replace('.png','')}</p>`;
            carouselInner.appendChild(item);
        });
    } catch (err) {
        console.error('Error loading avatars:', err);
    }
}

// attach listeners after avatars are loaded
function attachAvatarListeners() {
    try {
        document.querySelectorAll('.avatar-choice').forEach(img => {
            img.addEventListener('click', () => {
                document.getElementById('avatarInput').value = img.dataset.avatar;
                document.querySelectorAll('.avatar-choice').forEach(i => i.classList.remove('selected'));
                img.classList.add('selected');
            });
        });
    } catch (err) {
        console.error('Error attaching avatar listeners:', err);
    }
}