let isEditMode = false;
let currentEditId = null;

document.getElementById('propertyForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const statusMsg = document.getElementById('statusMsg');
    const formData = new FormData(e.target);

    submitBtn.disabled = true;
    submitBtn.innerText = 'ENVIANDO...';
    statusMsg.className = 'status-msg';
    statusMsg.style.display = 'none';

    try {
        const url = isEditMode ? `/api/properties/${currentEditId}` : '/api/properties';
        const method = isEditMode ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            statusMsg.innerText = isEditMode ? '¡Propiedad actualizada con éxito!' : '¡Propiedad agregada con éxito!';
            statusMsg.classList.add('success');
            if (isEditMode) {
                cancelEdit(); // Reset to add mode after success
            } else {
                e.target.reset();
            }
        } else {
            statusMsg.innerText = 'Error: ' + (result.detail || 'No se pudo guardar la propiedad');
            statusMsg.classList.add('error');
        }
    } catch (error) {
        statusMsg.innerText = 'Error de conexión con el servidor';
        statusMsg.classList.add('error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = isEditMode ? 'GUARDAR CAMBIOS' : 'AGREGAR PROPIEDAD';
        statusMsg.style.display = 'block';
        fetchProperties(); // Reload list
    }
});

// Function to fetch and display properties
async function fetchProperties() {
    const listContainer = document.getElementById('propertyList');

    try {
        const response = await fetch('/api/properties');
        const properties = await response.json();

        if (properties.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; color: var(--text-light);">No hay propiedades cargadas.</p>';
            return;
        }

        let html = '<div style="display: grid; gap: 1rem;">';

        properties.forEach(prop => {
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #e2e8f0; border-radius: var(--radius-md); background: #f8fafc;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0; color: var(--secondary); font-size: 1rem;">${prop.title}</h4>
                        <p style="margin: 0.25rem 0 0; font-size: 0.85rem; color: #64748b;">${prop.location} | ${prop.operation} | ${prop.price}</p>
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button onclick="editProperty(${prop.id})" style="background: var(--secondary); color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: background 0.2s;">
                            <i class="fas fa-edit"></i> EDITAR
                        </button>
                        <button onclick="deleteProperty(${prop.id})" style="background: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: background 0.2s;">
                            <i class="fas fa-trash-alt"></i> ELIMINAR
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        listContainer.innerHTML = html;

    } catch (error) {
        console.error('Error fetching properties:', error);
        listContainer.innerHTML = '<p style="text-align: center; color: #ef4444;">Error al cargar las propiedades.</p>';
    }
}

// Function to enter edit mode
async function editProperty(id) {
    try {
        const response = await fetch(`/api/properties/${id}`);
        if (!response.ok) throw new Error('Error al obtener datos');

        const prop = await response.json();
        const form = document.getElementById('propertyForm');

        // Populate form
        form.title.value = prop.title;
        form.location.value = prop.location;
        form.price.value = prop.price;
        form.type.value = prop.type;
        form.operation.value = prop.operation;
        form.surface.value = prop.surface;
        form.bedrooms.value = prop.bedrooms;
        form.bathrooms.value = prop.bathrooms;
        form.featured.value = (prop.featured !== undefined ? prop.featured : false).toString();
        form.reserved.value = (prop.reserved !== undefined ? prop.reserved : false).toString();
        form.alquilado.value = (prop.alquilado !== undefined ? prop.alquilado : false).toString();
        form.vendido.value = (prop.vendido !== undefined ? prop.vendido : false).toString();
        form.description.value = prop.description;
        form.latitude.value = prop.latitude || '';
        form.longitude.value = prop.longitude || '';
        form.video_url.value = prop.video_url || '';

        // Enter edit mode UI
        isEditMode = true;
        currentEditId = id;
        document.getElementById('editModeBanner').style.display = 'flex';
        document.getElementById('formTitle').innerText = 'Editar Propiedad';
        document.getElementById('submitBtn').innerText = 'GUARDAR CAMBIOS';

        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        alert('Error al cargar datos de la propiedad: ' + error.message);
    }
}

// Function to cancel/exit edit mode
function cancelEdit() {
    isEditMode = false;
    currentEditId = null;
    document.getElementById('propertyForm').reset();
    document.getElementById('editModeBanner').style.display = 'none';
    document.getElementById('formTitle').innerText = 'Agregar Nueva Propiedad';
    document.getElementById('submitBtn').innerText = 'AGREGAR PROPIEDAD';
}

// Function to delete property
async function deleteProperty(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta propiedad? Esta acción no se puede deshacer.')) {
        return;
    }

    try {
        const response = await fetch(`/api/properties/${id}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            fetchProperties(); // Refresh list
            alert('Propiedad eliminada correctamente');
        } else {
            const result = await response.json();
            alert('Error al eliminar: ' + (result.detail || 'Error desconocido'));
        }
    } catch (error) {
        console.error('Error deleting property:', error);
        alert('Error de conexión al intentar eliminar la propiedad');
    }
}

// Load properties on startup
document.addEventListener('DOMContentLoaded', fetchProperties);
