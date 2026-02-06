document.addEventListener('DOMContentLoaded', async () => {
    const pathParts = window.location.pathname.split('/');
    const propertyId = pathParts[pathParts.length - 1];

    if (!propertyId) {
        window.location.href = '/';
        return;
    }

    try {
        const response = await fetch(`/api/properties/${propertyId}`);
        if (!response.ok) throw new Error('Propiedad no encontrada');

        const property = await response.json();
        renderPropertyDetail(property);
    } catch (error) {
        console.error(error);
        document.getElementById('loading').innerHTML = `
            <div style="color: #991b1b; font-weight: 700;">
                <i class="fas fa-exclamation-triangle"></i> No pudimos encontrar esta propiedad.
                <br><br>
                <a href="/" style="color: var(--primary);">Volver al inicio</a>
            </div>
        `;
    }
});

function renderPropertyDetail(prop) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('detailContent').style.display = 'block';

    document.title = `${prop.title} - Agustín González Afonso`;

    document.getElementById('title').innerText = prop.title;
    document.getElementById('location').innerText = prop.location;
    document.getElementById('price').innerText = prop.price;
    document.getElementById('surface').innerText = `${prop.surface} m²`;
    document.getElementById('bedrooms').innerText = prop.bedrooms;
    document.getElementById('bathrooms').innerText = prop.bathrooms;
    document.getElementById('type').innerText = prop.type;
    document.getElementById('description').innerText = prop.description || "Sin descripción disponible.";

    // Gallery Logic
    const mainImg = document.getElementById('mainImg');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    let currentIndex = 0;
    const images = prop.images || [];

    if (images.length > 0) {
        const thumbsGrid = document.getElementById('thumbnails');

        const renderThumbnails = () => {
            thumbsGrid.innerHTML = '';

            const visibleIndices = [];
            const count = Math.min(4, images.length);

            for (let i = 0; i < count; i++) {
                // Shift window: start from the NEXT image relative to currentIndex
                visibleIndices.push((currentIndex + 1 + i) % images.length);
            }

            visibleIndices.forEach((idx) => {
                const img = document.createElement('img');
                img.src = images[idx];
                img.className = 'thumb-img';
                img.dataset.index = idx;
                img.alt = `Vista ${idx + 1}`;

                // Highlight active (it will always be the first one in this logic, but good for style)
                if (idx === currentIndex) {
                    img.style.border = '3px solid var(--primary)';
                    img.style.opacity = '1';
                } else {
                    img.style.border = 'none';
                    img.style.opacity = '0.7';
                }

                img.onclick = () => updateGallery(idx);
                thumbsGrid.appendChild(img);
            });
        };

        const updateGallery = (index) => {
            currentIndex = index;
            // Handle loop
            if (currentIndex < 0) currentIndex = images.length - 1;
            if (currentIndex >= images.length) currentIndex = 0;

            mainImg.src = images[currentIndex];
            renderThumbnails();
        };

        // Expose function globally for showPhotos to restore current image
        window.restoreCurrentPhoto = () => {
            mainImg.src = images[currentIndex];
        };

        updateGallery(0);

        prevBtn.onclick = () => updateGallery(currentIndex - 1);
        nextBtn.onclick = () => updateGallery(currentIndex + 1);

        // Hide arrows if only one image
        if (images.length <= 1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        }

        // Lightbox Functionality
        const lightbox = document.getElementById('lightbox');
        const lightboxImg = document.getElementById('lightboxImg');
        const closeBtn = document.getElementById('closeLightbox');
        const lbPrevBtn = document.getElementById('lightboxPrev');
        const lbNextBtn = document.getElementById('lightboxNext');

        const openLightbox = () => {
            lightboxImg.src = images[currentIndex];
            lightbox.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scroll
        };

        const closeLightbox = () => {
            lightbox.classList.remove('active');
            document.body.style.overflow = ''; // Restore scroll
        };

        const nextLightbox = (e) => {
            if (e) e.stopPropagation();
            updateGallery(currentIndex + 1);
            lightboxImg.src = images[currentIndex];
        };

        const prevLightbox = (e) => {
            if (e) e.stopPropagation();
            updateGallery(currentIndex - 1);
            lightboxImg.src = images[currentIndex];
        };

        mainImg.onclick = openLightbox;
        closeBtn.onclick = closeLightbox;
        lbNextBtn.onclick = nextLightbox;
        lbPrevBtn.onclick = prevLightbox;

        lightbox.onclick = (e) => {
            if (e.target === lightbox || e.target === closeBtn || e.target.classList.contains('fa-times')) {
                closeLightbox();
            }
        };

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('active')) return;

            if (e.key === 'Escape') {
                closeLightbox();
            } else if (e.key === 'ArrowRight') {
                nextLightbox();
            } else if (e.key === 'ArrowLeft') {
                prevLightbox();
            }
        });
    }

    // Video Logic - Enable video button if property has videos
    if (prop.videos && prop.videos.length > 0) {
        // Call the function defined in property_detail.html to enable video button
        if (typeof window.enableVideoButton === 'function') {
            window.enableVideoButton(prop.videos[0]);
        }
    }

    // Floor Plan Logic - Enable floor plan button if property has one
    if (prop.floorplan) {
        if (typeof window.enableFloorplanButton === 'function') {
            window.enableFloorplanButton(prop.floorplan);
        }
    }

    // Map Logic - Enable map button if property has coordinates
    if (prop.latitude && prop.longitude) {
        if (typeof window.enableMapButton === 'function') {
            window.enableMapButton(prop.latitude, prop.longitude);
        }
    }

}
