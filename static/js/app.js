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

    // Mobile Menu Toggle (using delegation for robustness)
    document.addEventListener('click', (e) => {
        const mobileMenu = e.target.closest('#mobileMenu');
        const navLinks = document.getElementById('navLinks');

        if (mobileMenu && navLinks) {
            console.log('Mobile menu clicked (delegated)');
            navLinks.classList.toggle('active');

            const isOpen = navLinks.classList.contains('active');
            const icon = mobileMenu.querySelector('i');
            if (icon) {
                if (isOpen) {
                    icon.classList.remove('fa-bars');
                    icon.classList.add('fa-times');
                } else {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
            return;
        }

        // Close menu on link click or outside click (using delegation)
        if (navLinks && navLinks.classList.contains('active')) {
            const link = e.target.closest('#navLinks a');
            const isOutside = !navLinks.contains(e.target) && (!mobileMenu || !mobileMenu.contains(e.target));

            if (link || isOutside) {
                console.log(link ? 'Nav link clicked, closing menu (delegated)' : 'Outside click, closing menu (delegated)');
                navLinks.classList.remove('active');
                const menuBtn = document.getElementById('mobileMenu');
                const icon = menuBtn ? menuBtn.querySelector('i') : null;
                if (icon) {
                    icon.classList.add('fa-bars');
                    icon.classList.remove('fa-times');
                }
            }
        }
    });

    // Intersection Observer for Reveal
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    // Search Capsule State Management
    const searchFields = document.querySelector('.header-search .search-fields');
    if (searchFields) {
        const inputs = searchFields.querySelectorAll('input, select');

        const updateSearchCapsuleState = () => {
            let hasSelection = false;
            inputs.forEach(input => {
                if (input.id === 'operationSelector') {
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
    }

    // Check for URL parameters or global initialOperation
    const params = new URLSearchParams(window.location.search);
    if (params.has('operation') || window.initialOperation) {
        if (params.has('operation')) {
            currentOperation = params.get('operation');
        } else if (window.initialOperation) {
            currentOperation = window.initialOperation;
        }

        const opSelector = document.getElementById('operationSelector');
        if (opSelector) opSelector.value = currentOperation;

        const typeSelector = document.getElementById('propertyType');
        if (typeSelector && params.has('type')) typeSelector.value = params.get('type');

        const roomsSelector = document.getElementById('rooms');
        if (roomsSelector && params.has('rooms')) roomsSelector.value = params.get('rooms');

        const locationInput = document.getElementById('locationSearch');
        if (locationInput && params.has('location')) locationInput.value = params.get('location');

        searchProperties(true);
        console.log('Initial search triggered with isInitial=true');
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
    // Include operation filter if: 
    // 1. It's not the initial load (user triggered search)
    // 2. We have an explicit initial operation (Venta/Alquiler pages)
    // 3. We have an operation in the URL parameters
    const params = new URLSearchParams(window.location.search);
    if (!isInitial || window.initialOperation || params.has('operation')) {
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

        // Close mobile menu if active (don't close on initial load as it shouldn't be open)
        if (!isInitial) {
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
                ${prop.vendido ? '<div class="reserved-ribbon">VENDIDO</div>' : (prop.alquilado ? '<div class="reserved-ribbon">ALQUILADO</div>' : (prop.reserved ? '<div class="reserved-ribbon">RESERVADO</div>' : ''))}
                <span class="property-badge">${prop.type} en ${prop.operation}</span>
            </div>
            <div class="property-info">
                <div class="property-title-small" style="font-weight: 800; color: var(--secondary); margin-bottom: 5px;">${prop.title}</div>
                <div class="property-location" style="font-size: 1rem; margin-bottom: 0.5rem;">${prop.location}</div>
                <div class="property-details">
                    <div class="detail-item"><i class="fas fa-expand"></i> ${prop.surface} m²</div>
                    <div class="detail-item"><i class="fas fa-bed"></i> ${prop.bedrooms} Amb.</div>
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


