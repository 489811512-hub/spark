const API_BASE = '/api';
let currentPage = 1;
let pageSize = 20;
let searchKeyword = '';
let statusFilter = '';
let totalPages = 1;
let pendingAction = null;
let searchTimer = null;

function navigateTo(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });
    document.querySelectorAll('.page').forEach(p => {
        p.classList.add('hidden');
    });
    document.getElementById(page + 'Page').classList.remove('hidden');
    const titles = {
        dashboard: '仪表盘',
        devices: '设备管理',
        password: '密码生成'
    };
    document.getElementById('pageTitle').textContent = titles[page] || '仪表盘';
    if (page === 'dashboard') {
        loadStats();
        loadRecentDevices();
    } else if (page === 'devices') {
        currentPage = 1;
        loadDevices();
    } else if (page === 'password') {
    }
}

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(item.dataset.page);
    });
});

async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        return null;
    }
}

async function loadStats() {
    const data = await apiRequest(`${API_BASE}/stats`);
    if (data) {
        document.getElementById('statTotal').textContent = data.total || 0;
        document.getElementById('statOnline').textContent = data.online || 0;
        document.getElementById('statLocked').textContent = data.locked || 0;
        document.getElementById('statToday').textContent = data.today_new || 0;
    }
}

async function loadRecentDevices() {
    const data = await apiRequest(`${API_BASE}/devices?page=1&pageSize=5`);
    const tbody = document.getElementById('recentDevices');
    if (data && data.list) {
        if (data.list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty">暂无设备</td></tr>';
        } else {
            tbody.innerHTML = data.list.map(device => renderDeviceRow(device, false)).join('');
        }
    } else {
        tbody.innerHTML = '<tr><td colspan="4" class="empty">加载失败</td></tr>';
    }
}

async function loadDevices() {
    const params = new URLSearchParams({
        page: currentPage,
        pageSize: pageSize,
        keyword: searchKeyword,
        status: statusFilter
    });
    const data = await apiRequest(`${API_BASE}/devices?${params}`);
    const tbody = document.getElementById('devicesList');
    if (data && data.list !== undefined) {
        totalPages = Math.ceil(data.total / pageSize) || 1;
        if (data.list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty">暂无设备</td></tr>';
        } else {
            tbody.innerHTML = data.list.map(device => renderDeviceRow(device, true)).join('');
        }
        renderPagination(data.total);
    } else {
        tbody.innerHTML = '<tr><td colspan="5" class="empty">加载失败</td></tr>';
    }
}

function renderDeviceRow(device, showActions) {
    const statusClass = device.locked ? 'locked' : 'unlocked';
    const statusText = device.locked ? '已锁定' : '正常';
    const regDate = formatDate(device.registered_at);
    const lastSeen = formatDate(device.last_seen);
    const actions = showActions ? `
        <td>
            ${device.locked 
                ? `<button class="btn btn-sm btn-outline-success" onclick="toggleLock('${device.machine_id}', false)">解锁</button>`
                : `<button class="btn btn-sm btn-outline-danger" onclick="toggleLock('${device.machine_id}', true)">锁定</button>`
            }
        </td>
    ` : '';
    const cols = showActions ? 5 : 4;
    return `
        <tr>
            <td style="font-family: Consolas, monospace; font-size: 13px;">${device.machine_id}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${regDate}</td>
            <td>${lastSeen}</td>
            ${actions}
        </tr>
    `;
}

function renderPagination(total) {
    const pagination = document.getElementById('pagination');
    let html = `<span style="color: var(--text-secondary); font-size: 13px; margin-right: 12px;">共 ${total} 条</span>`;
    html += `<button class="pagination-btn" onclick="goToPage(${currentPage - 1})" ${currentPage <= 1 ? 'disabled' : ''}>上一页</button>`;
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    html += `<button class="pagination-btn" onclick="goToPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled' : ''}>下一页</button>`;
    pagination.innerHTML = html;
}

function goToPage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    loadDevices();
}

function debouncedSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        searchKeyword = document.getElementById('searchInput').value.trim();
        currentPage = 1;
        loadDevices();
    }, 300);
}

document.getElementById('statusFilter').addEventListener('change', (e) => {
    statusFilter = e.target.value;
    currentPage = 1;
    loadDevices();
});

function toggleLock(machineId, shouldLock) {
    const action = shouldLock ? '锁定' : '解锁';
    showModal(
        `确认${action}`,
        `确定要${action}此设备吗？设备ID：${machineId.substring(0, 8)}...`,
        async () => {
            const data = await apiRequest(`${API_BASE}/devices/${encodeURIComponent(machineId)}/toggle-lock`, {
                method: 'POST'
            });
            if (data && data.success) {
                showToast(`${action}成功`, 'success');
                loadStats();
                loadDevices();
                loadRecentDevices();
            } else {
                showToast(`${action}失败`, 'error');
            }
        }
    );
}

function showModal(title, message, onConfirm) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalMessage').textContent = message;
    pendingAction = onConfirm;
    document.getElementById('confirmModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('confirmModal').classList.add('hidden');
    pendingAction = null;
}

function confirmAction() {
    if (pendingAction) {
        pendingAction();
    }
    closeModal();
}

function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.className = 'toast';
    if (type) {
        toast.classList.add(type);
    }
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function formatDate(dateStr) {
    try {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch {
        return '-';
    }
}

function refreshData() {
    const activePage = document.querySelector('.nav-item.active').dataset.page;
    if (activePage === 'dashboard') {
        loadStats();
        loadRecentDevices();
    } else if (activePage === 'devices') {
        loadDevices();
    }
    showToast('已刷新', 'success');
}

async function generatePassword() {
    const machineId = document.getElementById('genMachineId').value.trim();
    if (!machineId) {
        showToast('请输入机器码', 'error');
        return;
    }
    const data = await apiRequest(`${API_BASE}/generate-password`, {
        method: 'POST',
        body: JSON.stringify({ machine_id: machineId })
    });
    if (data && data.password) {
        document.getElementById('resultPassword').textContent = data.password;
        document.getElementById('passwordResult').classList.remove('hidden');
        showToast('密码生成成功', 'success');
    } else {
        showToast('生成失败', 'error');
    }
}

function copyPassword() {
    const password = document.getElementById('resultPassword').textContent;
    navigator.clipboard.writeText(password).then(() => {
        showToast('密码已复制', 'success');
    }).catch(() => {
        showToast('复制失败', 'error');
    });
}

document.getElementById('genMachineId')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        generatePassword();
    }
});

document.getElementById('confirmModal').addEventListener('click', (e) => {
    if (e.target.id === 'confirmModal') {
        closeModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

loadStats();
loadRecentDevices();
