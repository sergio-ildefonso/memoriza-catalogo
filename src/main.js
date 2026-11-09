import fallbackProducts from '../products.json';

const container = document.getElementById('products');
const empty = document.getElementById('empty');
const newButton = document.getElementById('new-product');
const dialog = document.getElementById('product-dialog');
const form = document.getElementById('product-form');
const dialogTitle = document.getElementById('dialog-title');

let editable = false;
let products = [];
let editingId = null;

async function request(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Erro ${response.status}`);
    }
    return response.status === 204 ? null : response.json();
}

function send(url, method, data) {
    return request(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

function card(product) {
    const article = document.createElement('article');
    article.className = 'card';

    const image = document.createElement('img');
    image.src = product.image;
    image.alt = product.name;
    image.loading = 'lazy';

    const title = document.createElement('h2');
    title.textContent = product.name;

    const description = document.createElement('p');
    description.textContent = product.description;

    const meta = document.createElement('p');
    meta.className = 'meta';
    meta.textContent = [product.material, product.tipo, product.tamanho].filter(Boolean).join(' · ');

    article.append(image, title, description, meta);

    if (editable) {
        const actions = document.createElement('div');
        actions.className = 'actions';
        for (const [action, label, className] of [['edit', 'Editar', ''], ['delete', 'Apagar', 'danger']]) {
            const button = document.createElement('button');
            button.type = 'button';
            button.dataset.action = action;
            button.dataset.id = product.id;
            button.textContent = label;
            button.className = className;
            actions.append(button);
        }
        article.append(actions);
    }

    return article;
}

function render() {
    container.replaceChildren(...products.map(card));
    empty.hidden = products.length > 0;
}

async function load() {
    try {
        products = await request('/api/products');
        editable = true;
        newButton.hidden = false;
    } catch {
        products = fallbackProducts;
        editable = false;
        newButton.hidden = true;
    }
    render();
}

function openForm(product) {
    editingId = product ? product.id : null;
    dialogTitle.textContent = product ? 'Editar produto' : 'Novo produto';
    for (const field of form.elements) {
        if (field.name && field.type !== 'file') field.value = product ? (product[field.name] ?? '') : '';
    }
    form.elements.file.value = '';
    dialog.showModal();
}

async function uploadImage(file) {
    const response = await fetch(`/api/images/${encodeURIComponent(file.name)}`, {
        method: 'PUT',
        body: file,
    });
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Erro ${response.status}`);
    }
    return response.json();
}

form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    delete data.file;
    const file = form.elements.file.files[0];
    try {
        if (file) data.image = (await uploadImage(file)).path;
        if (!data.image.trim()) {
            alert('Escolhe um ficheiro ou indica o caminho da imagem.');
            return;
        }
        if (editingId === null) await send('/api/products', 'POST', data);
        else await send(`/api/products/${editingId}`, 'PUT', data);
        dialog.close();
        await load();
    } catch (error) {
        alert(error.message);
    }
});

newButton.addEventListener('click', () => openForm(null));
document.getElementById('cancel').addEventListener('click', () => dialog.close());

container.addEventListener('click', async event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const id = Number(button.dataset.id);
    const product = products.find(p => p.id === id);

    if (button.dataset.action === 'edit') {
        openForm(product);
        return;
    }

    if (!confirm(`Apagar "${product.name}"?`)) return;
    try {
        await request(`/api/products/${id}`, { method: 'DELETE' });
        await load();
    } catch (error) {
        alert(error.message);
    }
});

load();
