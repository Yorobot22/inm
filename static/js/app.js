let currentOperation = 'Venta';

// UI Logic
document.addEventListener('DOMContentLoaded', () => {
    // Scroll Effect
    const header = document.getElementById('header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // Mobile Menu Toggle
    const mobileMenu = document.getElementById('mobileMenu');
    const navLinks = document.getElementById('navLinks');
    if (mobileMenu && navLinks) {
        mobileMenu.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = mobileMenu.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });

        // Close menu on link click
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                const icon = mobileMenu.querySelector('i');
                if (icon) {
                    icon.classList.add('fa-bars');
                    icon.classList.remove('fa-times');
                }
            });
        });
    }

    // Intersection Observer for Reveal
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // Initial load - fetch all to show featured
    searchProperties(true);

    // Search Capsule State Management
    const searchFields = document.querySelector('.header-search .search-fields');
    const inputs = searchFields.querySelectorAll('input, select');

    const updateSearchCapsuleState = () => {
        let hasSelection = false;
        inputs.forEach(input => {
            if (input.id === 'operationSelector') {
                // Operation always has a value, but check if it's default or not
                // (Optional: you can decide if "Venta" counts as selection)
                if (input.value !== 'Venta') hasSelection = true;
            } else if (input.value && input.value !== '') {
                hasSelection = true;
            }
        });

        if (hasSelection) {
            searchFields.classList.add('has-selection');
        } else {
            searchFields.classList.remove('has-selection');
        }
    };

    inputs.forEach(input => {
        input.addEventListener('change', updateSearchCapsuleState);
        input.addEventListener('input', updateSearchCapsuleState);
    });

    // Initial check
    updateSearchCapsuleState();

    // Check for URL parameters on load
    const params = new URLSearchParams(window.location.search);
    if (params.has('operation')) {
        currentOperation = params.get('operation');
        const opSelector = document.getElementById('operationSelector');
        if (opSelector) opSelector.value = currentOperation;

        const typeSelector = document.getElementById('propertyType');
        if (typeSelector && params.has('type')) typeSelector.value = params.get('type');

        const roomsSelector = document.getElementById('rooms');
        if (roomsSelector && params.has('rooms')) roomsSelector.value = params.get('rooms');

        const locationInput = document.getElementById('locationSearch');
        if (locationInput && params.has('location')) locationInput.value = params.get('location');

        searchProperties();
    } else {
        // Initial load - fetch all to show featured
        searchProperties(true);
    }
});

function setOperation(op) {
    currentOperation = op;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === op);
    });
    const selector = document.getElementById('operationSelector');
    if (selector) selector.value = op;
}

async function searchProperties(isInitial = false) {
    const typeEl = document.getElementById('propertyType');
    const locationEl = document.getElementById('locationSearch');
    const roomsEl = document.getElementById('rooms');

    const type = typeEl ? typeEl.value : '';
    const location = locationEl ? locationEl.value : '';
    const rooms = roomsEl ? roomsEl.value : '';

    const grid = document.getElementById('propertiesGrid');
    if (!grid && !isInitial) {
        // Redirect to home with search params
        const searchParams = new URLSearchParams({
            operation: currentOperation,
            type: type,
            rooms: rooms,
            location: location
        });
        window.location.href = `/?${searchParams.toString()}#propiedades`;
        return;
    }

    let url = `/api/properties?`;
    if (!isInitial) {
        url += `operation=${currentOperation}`;
    }

    if (type) url += (url.endsWith('?') ? '' : '&') + `type=${type}`;
    if (rooms) url += (url.endsWith('?') ? '' : '&') + `rooms=${rooms}`;
    if (location) url += (url.endsWith('?') ? '' : '&') + `location=${location}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const properties = await response.json();
        renderProperties(properties);

        // Close mobile menu if active
        const navLinks = document.getElementById('navLinks');
        const mobileMenu = document.getElementById('mobileMenu');
        if (navLinks && navLinks.classList.contains('active')) {
            navLinks.classList.remove('active');
            const icon = mobileMenu.querySelector('i');
            if (icon) {
                icon.classList.add('fa-bars');
                icon.classList.remove('fa-times');
            }
        }
    } catch (error) {
        console.error('Error fetching properties:', error);
    }
}

function renderProperties(properties) {
    const grid = document.getElementById('propertiesGrid');
    if (!grid) return;

    grid.innerHTML = '';

    if (properties.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-light);">No se encontraron propiedades.</div>';
        return;
    }

    properties.slice(0, 9).forEach((prop, index) => {
        const card = document.createElement('a');
        card.href = `/propiedad/${prop.id}`;
        card.className = 'property-card reveal';
        card.style.animationDelay = `${index * 0.1}s`;
        card.style.textDecoration = 'none';

        const mainImage = prop.images && prop.images.length > 0 ? prop.images[0] : '/static/img/placeholder.jpg';

        card.innerHTML = `
            <div class="property-image-wrapper">
                <div class="property-image" style="background-image: url('${mainImage}')"></div>
                <span class="property-badge">${prop.type} en ${prop.operation}</span>
            </div>
            <div class="property-info">
                <div class="property-title-small" style="font-weight: 800; color: var(--secondary); margin-bottom: 5px;">${prop.title}</div>
                <div class="property-location" style="font-size: 1rem; margin-bottom: 0.5rem;">${prop.location}</div>
                <div class="property-details">
                    <div class="detail-item"><i class="fas fa-expand"></i> ${prop.surface} m²</div>
                    <div class="detail-item"><i class="fas fa-bed"></i> ${prop.bedrooms} Dorm</div>
                    <div class="detail-item"><i class="fas fa-bath"></i> ${prop.bathrooms} Baños</div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    // Re-observe new elements
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    grid.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}


