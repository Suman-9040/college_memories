// College Memories App - JavaScript
class CollegeMemoriesApp {
    constructor() {
        this.memories = this.loadMemories();
        this.currentFiles = [];
        this.currentFilter = 'all';
        this.currentView = 'grid';
        this.memoryToDelete = null;
        this.memoriesToImport = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.renderMemories();
        this.setCurrentDate();
    }

    setupEventListeners() {
        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.filter);
            });
        });

        // View toggle buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setView(e.target.dataset.view);
            });
        });

        // File input
        const fileInput = document.getElementById('fileInput');
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });

        // Drag and drop
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleFileSelect(e.dataTransfer.files);
        });

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => {
            this.performSearch(e.target.value);
        });

        // Category and date filters
        document.getElementById('categoryFilter').addEventListener('change', () => {
            this.performSearch();
        });

        document.getElementById('dateFilter').addEventListener('change', () => {
            this.performSearch();
        });

        // Modal close on outside click
        document.getElementById('memoryModal').addEventListener('click', (e) => {
            if (e.target.id === 'memoryModal') {
                this.closeModal();
            }
        });

        // Delete modal close on outside click
        document.getElementById('deleteModal').addEventListener('click', (e) => {
            if (e.target.id === 'deleteModal') {
                this.closeDeleteModal();
            }
        });

        // Import file input
        const importInput = document.getElementById('importInput');
        importInput.addEventListener('change', (e) => {
            this.handleImportFile(e.target.files[0]);
        });

        // Import drag and drop
        const importArea = document.getElementById('importArea');
        importArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            importArea.classList.add('dragover');
        });

        importArea.addEventListener('dragleave', () => {
            importArea.classList.remove('dragover');
        });

        importArea.addEventListener('drop', (e) => {
            e.preventDefault();
            importArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type === 'application/json') {
                this.handleImportFile(file);
            } else {
                this.showMessage('Please select a valid .json file.', 'error');
            }
        });
    }

    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update active content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        // Special handling for search tab
        if (tabName === 'search') {
            this.performSearch();
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

        this.renderMemories();
    }

    setView(view) {
        this.currentView = view;
        
        // Update active view button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');

        // Update grid class
        const grid = document.getElementById('memoriesGrid');
        if (view === 'list') {
            grid.classList.add('list-view');
        } else {
            grid.classList.remove('list-view');
        }

        this.renderMemories();
    }

    handleFileSelect(files) {
        this.currentFiles = Array.from(files).filter(file => {
            return file.type.startsWith('image/') || file.type.startsWith('video/');
        });

        if (this.currentFiles.length === 0) {
            this.showMessage('Please select valid image or video files.', 'error');
            return;
        }

        this.showUploadPreview();
        document.getElementById('uploadForm').style.display = 'block';
    }

    showUploadPreview() {
        const preview = document.getElementById('uploadPreview');
        preview.innerHTML = '';

        this.currentFiles.forEach((file, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';

            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                previewItem.appendChild(img);
            } else if (file.type.startsWith('video/')) {
                const video = document.createElement('video');
                video.src = URL.createObjectURL(file);
                video.controls = true;
                previewItem.appendChild(video);
            }

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-btn';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = () => this.removeFile(index);
            previewItem.appendChild(removeBtn);

            preview.appendChild(previewItem);
        });
    }

    removeFile(index) {
        this.currentFiles.splice(index, 1);
        this.showUploadPreview();
        
        if (this.currentFiles.length === 0) {
            document.getElementById('uploadForm').style.display = 'none';
        }
    }

    async saveMemory() {
        const title = document.getElementById('memoryTitle').value.trim();
        const description = document.getElementById('memoryDescription').value.trim();
        const category = document.getElementById('memoryCategory').value;
        const date = document.getElementById('memoryDate').value;

        if (!title) {
            this.showMessage('Please enter a title for your memory.', 'error');
            return;
        }

        if (this.currentFiles.length === 0) {
            this.showMessage('Please select at least one file.', 'error');
            return;
        }

        // Show loading message
        this.showMessage('Saving memory...', 'success');

        try {
            // Process each file and create memory objects
            for (const file of this.currentFiles) {
                const fileDataUrl = await this.fileToDataURL(file);
                
                const memory = {
                    id: Date.now() + Math.random(),
                    title: title,
                    description: description,
                    category: category,
                    date: date || new Date().toISOString().split('T')[0],
                    fileDataUrl: fileDataUrl,
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    type: file.type.startsWith('image/') ? 'photo' : 'video',
                    createdAt: new Date().toISOString()
                };

                this.memories.unshift(memory);
            }

            this.saveMemories();
            this.showMessage('Memory saved successfully!', 'success');
            this.cancelUpload();
            this.switchTab('gallery');
            this.renderMemories();
        } catch (error) {
            console.error('Error saving memory:', error);
            this.showMessage('Error saving memory. Please try again.', 'error');
        }
    }

    fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    cancelUpload() {
        this.currentFiles = [];
        document.getElementById('fileInput').value = '';
        document.getElementById('uploadForm').style.display = 'none';
        document.getElementById('uploadPreview').innerHTML = '';
        document.getElementById('memoryTitle').value = '';
        document.getElementById('memoryDescription').value = '';
        document.getElementById('memoryCategory').value = 'general';
        document.getElementById('memoryDate').value = '';
    }

    renderMemories() {
        const grid = document.getElementById('memoriesGrid');
        const emptyState = document.getElementById('emptyState');
        
        let filteredMemories = this.memories;

        // Apply filter
        if (this.currentFilter !== 'all') {
            filteredMemories = filteredMemories.filter(memory => 
                memory.type === this.currentFilter.slice(0, -1) // Remove 's' from 'photos'/'videos'
            );
        }

        if (filteredMemories.length === 0) {
            grid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        grid.style.display = 'grid';
        emptyState.style.display = 'none';
        grid.innerHTML = '';

        filteredMemories.forEach(memory => {
            const memoryElement = this.createMemoryElement(memory);
            grid.appendChild(memoryElement);
        });
    }

    createMemoryElement(memory) {
        const memoryDiv = document.createElement('div');
        memoryDiv.className = `memory-item ${this.currentView === 'list' ? 'list-view' : ''}`;
        memoryDiv.onclick = (e) => {
            // Don't open modal if delete button was clicked
            if (!e.target.closest('.delete-btn')) {
                this.openMemoryModal(memory);
            }
        };

        const media = document.createElement(memory.type === 'photo' ? 'img' : 'video');
        media.className = 'memory-media';
        media.src = memory.fileDataUrl;
        
        if (memory.type === 'video') {
            media.controls = true;
        }

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            this.showDeleteModal(memory);
        };

        const typeBadge = document.createElement('div');
        typeBadge.className = 'memory-type';
        typeBadge.textContent = memory.type === 'photo' ? '📷' : '🎥';

        const info = document.createElement('div');
        info.className = 'memory-info';

        const title = document.createElement('h3');
        title.className = 'memory-title';
        title.textContent = memory.title;

        const description = document.createElement('p');
        description.className = 'memory-description';
        description.textContent = memory.description || 'No description provided';

        const meta = document.createElement('div');
        meta.className = 'memory-meta';

        const category = document.createElement('span');
        category.className = 'memory-category';
        category.textContent = memory.category;

        const date = document.createElement('span');
        date.textContent = new Date(memory.date).toLocaleDateString();

        meta.appendChild(category);
        meta.appendChild(date);

        info.appendChild(title);
        info.appendChild(description);
        info.appendChild(meta);

        memoryDiv.appendChild(media);
        memoryDiv.appendChild(deleteBtn);
        memoryDiv.appendChild(typeBadge);
        memoryDiv.appendChild(info);

        return memoryDiv;
    }

    openMemoryModal(memory) {
        const modal = document.getElementById('memoryModal');
        const modalBody = document.getElementById('modalBody');

        const media = document.createElement(memory.type === 'photo' ? 'img' : 'video');
        media.className = 'modal-media';
        media.src = memory.fileDataUrl;
        
        if (memory.type === 'video') {
            media.controls = true;
        }

        const title = document.createElement('h2');
        title.className = 'modal-title';
        title.textContent = memory.title;

        const description = document.createElement('p');
        description.className = 'modal-description';
        description.textContent = memory.description || 'No description provided';

        const meta = document.createElement('div');
        meta.className = 'modal-meta';
        meta.innerHTML = `
            <span><strong>Category:</strong> ${memory.category}</span>
            <span><strong>Date:</strong> ${new Date(memory.date).toLocaleDateString()}</span>
            <span><strong>Type:</strong> ${memory.type}</span>
        `;

        // Action buttons
        const actions = document.createElement('div');
        actions.className = 'memory-actions';
        actions.innerHTML = `
            <button class="edit-btn" onclick="app.editMemory(${JSON.stringify(memory).replace(/"/g, '&quot;')})">
                <i class="fas fa-edit"></i>
                Edit
            </button>
            <button class="btn-danger" onclick="app.showDeleteModal(${JSON.stringify(memory).replace(/"/g, '&quot;')})">
                <i class="fas fa-trash"></i>
                Delete
            </button>
        `;

        modalBody.innerHTML = '';
        modalBody.appendChild(media);
        modalBody.appendChild(title);
        modalBody.appendChild(description);
        modalBody.appendChild(meta);
        modalBody.appendChild(actions);

        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('memoryModal').style.display = 'none';
    }

    showDeleteModal(memory) {
        this.memoryToDelete = memory;
        const modal = document.getElementById('deleteModal');
        const preview = document.getElementById('deletePreview');

        // Create preview of memory to be deleted
        const media = document.createElement(memory.type === 'photo' ? 'img' : 'video');
        media.src = memory.fileDataUrl;
        if (memory.type === 'video') {
            media.controls = true;
        }

        const info = document.createElement('div');
        info.className = 'delete-preview-info';
        info.innerHTML = `
            <h4>${memory.title}</h4>
            <p>${memory.description || 'No description'}</p>
            <p><strong>Category:</strong> ${memory.category} | <strong>Date:</strong> ${new Date(memory.date).toLocaleDateString()}</p>
        `;

        preview.innerHTML = '';
        preview.appendChild(media);
        preview.appendChild(info);

        modal.style.display = 'block';
    }

    closeDeleteModal() {
        document.getElementById('deleteModal').style.display = 'none';
        this.memoryToDelete = null;
    }

    confirmDelete() {
        if (this.memoryToDelete) {
            // Find and remove the memory
            const index = this.memories.findIndex(m => m.id === this.memoryToDelete.id);
            if (index !== -1) {
                this.memories.splice(index, 1);
                this.saveMemories();
                this.showMessage('Memory deleted successfully!', 'success');
                this.renderMemories();
                this.performSearch(); // Update search results if on search tab
            }
        }
        this.closeDeleteModal();
    }

    editMemory(memory) {
        // Close the modal first
        this.closeModal();
        
        // Switch to upload tab and populate form
        this.switchTab('upload');
        
        // Populate the form with existing data
        document.getElementById('memoryTitle').value = memory.title;
        document.getElementById('memoryDescription').value = memory.description;
        document.getElementById('memoryCategory').value = memory.category;
        document.getElementById('memoryDate').value = memory.date;
        
        // Create a temporary file object from the data URL for editing
        this.createFileFromDataURL(memory.fileDataUrl, memory.fileName, memory.fileType).then(file => {
            this.currentFiles = [file];
            this.showUploadPreview();
            document.getElementById('uploadForm').style.display = 'block';
        });
        
        // Remove the original memory (will be replaced when saved)
        const index = this.memories.findIndex(m => m.id === memory.id);
        if (index !== -1) {
            this.memories.splice(index, 1);
        }
        
        this.showMessage('Memory loaded for editing. Make your changes and save.', 'success');
    }

    createFileFromDataURL(dataURL, fileName, fileType) {
        return new Promise((resolve) => {
            fetch(dataURL)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], fileName, { type: fileType });
                    resolve(file);
                });
        });
    }

    performSearch(query = '') {
        const searchInput = document.getElementById('searchInput');
        const categoryFilter = document.getElementById('categoryFilter');
        const dateFilter = document.getElementById('dateFilter');
        
        if (query === '') {
            query = searchInput.value;
        }

        const category = categoryFilter.value;
        const date = dateFilter.value;

        let filteredMemories = this.memories;

        // Text search
        if (query) {
            filteredMemories = filteredMemories.filter(memory =>
                memory.title.toLowerCase().includes(query.toLowerCase()) ||
                memory.description.toLowerCase().includes(query.toLowerCase())
            );
        }

        // Category filter
        if (category) {
            filteredMemories = filteredMemories.filter(memory =>
                memory.category === category
            );
        }

        // Date filter
        if (date) {
            filteredMemories = filteredMemories.filter(memory =>
                memory.date === date
            );
        }

        this.displaySearchResults(filteredMemories);
    }

    displaySearchResults(memories) {
        const resultsContainer = document.getElementById('searchResults');
        
        if (memories.length === 0) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No memories found</h3>
                    <p>Try adjusting your search criteria or add some memories first!</p>
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = `
            <div class="search-summary">
                <p>Found ${memories.length} memory${memories.length !== 1 ? 'ies' : ''}</p>
            </div>
            <div class="memories-grid">
                ${memories.map(memory => {
                    return `
                        <div class="memory-item" onclick="app.openMemoryModal(${JSON.stringify(memory).replace(/"/g, '&quot;')})">
                            ${memory.type === 'photo' ? 
                                `<img class="memory-media" src="${memory.fileDataUrl}" alt="${memory.title}">` :
                                `<video class="memory-media" src="${memory.fileDataUrl}" controls></video>`
                            }
                            <div class="memory-type">${memory.type === 'photo' ? '📷' : '🎥'}</div>
                            <div class="memory-info">
                                <h3 class="memory-title">${memory.title}</h3>
                                <p class="memory-description">${memory.description || 'No description provided'}</p>
                                <div class="memory-meta">
                                    <span class="memory-category">${memory.category}</span>
                                    <span>${new Date(memory.date).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    setCurrentDate() {
        const dateInput = document.getElementById('memoryDate');
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    showMessage(message, type = 'success') {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;

        const mainContent = document.querySelector('.main-content');
        mainContent.insertBefore(messageDiv, mainContent.firstChild);

        // Auto remove after 3 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    loadMemories() {
        try {
            const saved = localStorage.getItem('collegeMemories');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Error loading memories:', error);
            return [];
        }
    }

    saveMemories() {
        try {
            // Memories are already in serializable format with fileDataUrl
            localStorage.setItem('collegeMemories', JSON.stringify(this.memories));
        } catch (error) {
            console.error('Error saving memories:', error);
            this.showMessage('Error saving memories. Please try again.', 'error');
        }
    }

    // Import/Export functionality
    handleImportFile(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Validate the imported data
                if (!Array.isArray(importedData)) {
                    this.showMessage('Invalid file format. Please select a valid College Memories export file.', 'error');
                    return;
                }

                // Check if memories have required properties
                const validMemories = importedData.filter(memory => 
                    memory.title && memory.fileDataUrl && memory.type
                );

                if (validMemories.length === 0) {
                    this.showMessage('No valid memories found in the file.', 'error');
                    return;
                }

                this.memoriesToImport = validMemories;
                this.showImportPreview();
                this.showMessage(`Found ${validMemories.length} memories to import.`, 'success');
            } catch (error) {
                console.error('Error parsing import file:', error);
                this.showMessage('Error reading the file. Please make sure it\'s a valid College Memories export file.', 'error');
            }
        };
        reader.readAsText(file);
    }

    showImportPreview() {
        const preview = document.getElementById('importPreview');
        const list = document.getElementById('importList');
        
        list.innerHTML = '';
        
        this.memoriesToImport.forEach(memory => {
            const item = document.createElement('div');
            item.className = 'import-item';
            
            const media = document.createElement(memory.type === 'photo' ? 'img' : 'video');
            media.src = memory.fileDataUrl;
            if (memory.type === 'video') {
                media.controls = true;
            }
            
            const info = document.createElement('div');
            info.className = 'import-item-info';
            info.innerHTML = `
                <h5>${memory.title}</h5>
                <p>${memory.category} • ${new Date(memory.date).toLocaleDateString()}</p>
            `;
            
            item.appendChild(media);
            item.appendChild(info);
            list.appendChild(item);
        });
        
        preview.style.display = 'block';
    }

    confirmImport() {
        if (this.memoriesToImport.length === 0) return;

        // Add imported memories to the collection
        this.memoriesToImport.forEach(memory => {
            // Generate new ID to avoid conflicts
            memory.id = Date.now() + Math.random();
            this.memories.unshift(memory);
        });

        this.saveMemories();
        this.showMessage(`Successfully imported ${this.memoriesToImport.length} memories!`, 'success');
        this.cancelImport();
        this.switchTab('gallery');
        this.renderMemories();
    }

    cancelImport() {
        this.memoriesToImport = [];
        document.getElementById('importPreview').style.display = 'none';
        document.getElementById('importInput').value = '';
    }

    exportAllMemories() {
        if (this.memories.length === 0) {
            this.showMessage('No memories to export.', 'error');
            return;
        }

        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            memories: this.memories
        };

        this.downloadFile(exportData, 'college-memories-all.json');
        this.showMessage('All memories exported successfully!', 'success');
    }

    exportByCategory() {
        const category = document.getElementById('exportCategory').value;
        
        if (category === 'all') {
            this.exportAllMemories();
            return;
        }

        const filteredMemories = this.memories.filter(memory => memory.category === category);
        
        if (filteredMemories.length === 0) {
            this.showMessage(`No memories found in the "${category}" category.`, 'error');
            return;
        }

        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            category: category,
            memories: filteredMemories
        };

        this.downloadFile(exportData, `college-memories-${category}.json`);
        this.showMessage(`${filteredMemories.length} memories from "${category}" category exported successfully!`, 'success');
    }

    downloadFile(data, filename) {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Global functions for HTML onclick handlers
function switchTab(tabName) {
    app.switchTab(tabName);
}

function cancelUpload() {
    app.cancelUpload();
}

function saveMemory() {
    app.saveMemory();
}

function closeModal() {
    app.closeModal();
}

function closeDeleteModal() {
    app.closeDeleteModal();
}

function confirmDelete() {
    app.confirmDelete();
}

function cancelImport() {
    app.cancelImport();
}

function confirmImport() {
    app.confirmImport();
}

function exportAllMemories() {
    app.exportAllMemories();
}

function exportByCategory() {
    app.exportByCategory();
}

// Initialize the app when the page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new CollegeMemoriesApp();
});

// Handle page visibility change to save data
document.addEventListener('visibilitychange', () => {
    if (document.hidden && app) {
        app.saveMemories();
    }
});

// Handle beforeunload to save data
window.addEventListener('beforeunload', () => {
    if (app) {
        app.saveMemories();
    }
});
