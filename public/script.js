class ZFrame {
	constructor() {
		this.token = localStorage.getItem('zframe_token');
		this.username = localStorage.getItem('zframe_username');
		this.apiBase = window.location.origin;
		this.currentSection = 'login';
		this.isAuthenticated = false;
		this.userImages = [];

		this.init();
	}

	init() {
		this.setupEventListeners();
		this.checkAuthStatus();
		this.initializeUI();
	}

	initializeUI() {
		// Initialize sidebar toggle
		this.setupSidebarToggle();

		// Initialize upload drag and drop
		this.setupUploadDragDrop();

		// Initialize view toggle
		this.setupViewToggle();
	}

	setupEventListeners() {
		// Authentication
		document.getElementById('login-form').addEventListener('submit', (e) => {
			e.preventDefault();
			this.handleLogin();
		});

		document.getElementById('logout-btn').addEventListener('click', () => {
			this.handleLogout();
		});

		// Navigation
		document.querySelectorAll('.nav-item').forEach(item => {
			item.addEventListener('click', () => {
				const section = item.dataset.section;
				if (!item.classList.contains('hidden')) {
					this.navigateToSection(section);
				}
			});
		});

		// Token management
		document.getElementById('generate-token').addEventListener('click', () => {
			this.generateNewToken();
		});

		document.getElementById('revoke-token').addEventListener('click', () => {
			this.revokeToken();
		});

		document.getElementById('copy-token').addEventListener('click', () => {
			this.copyToken();
		});

		// Upload
		document.getElementById('upload-btn').addEventListener('click', () => {
			this.handleUpload();
		});

		// Gallery
		document.getElementById('refresh-gallery').addEventListener('click', () => {
			this.loadUserImages();
		});

		// Modal
		document.querySelector('.modal-close').addEventListener('click', () => {
			this.closeModal();
		});

		document.getElementById('image-modal').addEventListener('click', (e) => {
			if (e.target.classList.contains('modal-backdrop')) {
				this.closeModal();
			}
		});

		document.getElementById('copy-url').addEventListener('click', () => {
			this.copyImageUrl();
		});

		document.getElementById('download-image').addEventListener('click', () => {
			this.downloadImage();
		});

		document.getElementById('delete-image').addEventListener('click', () => {
			this.deleteImage();
		});
	}

	setupSidebarToggle() {
		const sidebarToggle = document.getElementById('sidebar-toggle');
		const sidebar = document.getElementById('sidebar');

		sidebarToggle.addEventListener('click', () => {
			sidebar.classList.toggle('open');
		});

		// Close sidebar when clicking outside on mobile
		document.addEventListener('click', (e) => {
			if (window.innerWidth <= 1024) {
				if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
					sidebar.classList.remove('open');
				}
			}
		});
	}

	setupUploadDragDrop() {
		const uploadArea = document.getElementById('upload-area');
		const fileInput = document.getElementById('image-file');

		if (!uploadArea || !fileInput) {
			return;
		}

		uploadArea.addEventListener('click', () => {
			fileInput.click();
		});

		fileInput.addEventListener('change', (e) => {
			if (e.target.files[0]) {
				this.handleFileSelect(e.target.files[0]);
			}
		});

		// Drag and drop functionality
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

			const files = e.dataTransfer.files;
			if (files[0] && files[0].type.startsWith('image/')) {
				fileInput.files = files;
				this.handleFileSelect(files[0]);
			}
		});
	}

	setupViewToggle() {
		document.querySelectorAll('[data-view]').forEach(btn => {
			btn.addEventListener('click', () => {
				const view = btn.dataset.view;
				this.switchGalleryView(view);

				// Update active state
				document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
				btn.classList.add('active');
			});
		});
	}

	checkAuthStatus() {
		if (this.token && this.username) {
			this.isAuthenticated = true;
			this.showAuthenticatedState();
			this.navigateToSection('dashboard');
			this.loadUserStats();
			this.updateTokenDisplay();
		} else {
			this.isAuthenticated = false;
			this.showUnauthenticatedState();
			this.navigateToSection('login');
		}
	}

	showAuthenticatedState() {
		// Show authenticated navigation items
		document.querySelectorAll('.nav-item[data-section="dashboard"], .nav-item[data-section="upload"], .nav-item[data-section="gallery"]').forEach(item => {
			item.classList.remove('hidden');
		});

		// Hide login nav item
		document.querySelector('.nav-item[data-section="login"]').classList.add('hidden');

		// Show user profile
		document.getElementById('user-profile').classList.remove('hidden');
		document.getElementById('sidebar-username').textContent = this.username;
	}

	showUnauthenticatedState() {
		// Hide authenticated navigation items
		document.querySelectorAll('.nav-item[data-section="dashboard"], .nav-item[data-section="upload"], .nav-item[data-section="gallery"]').forEach(item => {
			item.classList.add('hidden');
		});

		// Show login nav item
		document.querySelector('.nav-item[data-section="login"]').classList.remove('hidden');

		// Hide user profile
		document.getElementById('user-profile').classList.add('hidden');
	}


	navigateToSection(section) {
		// Update navigation active state
		document.querySelectorAll('.nav-item').forEach(item => {
			item.classList.remove('active');
		});
		document.querySelector(`[data-section="${section}"]`).classList.add('active');

		// Update content sections
		document.querySelectorAll('.content-section').forEach(sec => {
			sec.classList.remove('active');
		});
		document.getElementById(`${section}-section`).classList.add('active');

		// Update page title and subtitle
		this.updatePageTitle(section);
		this.currentSection = section;

		// Load section-specific data
		if (section === 'gallery' && this.isAuthenticated) {
			this.loadUserImages();
		}
	}

	updatePageTitle(section) {
		const titles = {
			login: { title: 'Welcome to Z-Frame', subtitle: 'Secure image hosting and management' },
			dashboard: { title: 'Dashboard', subtitle: 'Overview of your account and images' },
			upload: { title: 'Upload Images', subtitle: 'Add new images to your vault' },
			gallery: { title: 'Frames', subtitle: 'Browse and manage your uploaded images' }
		};

		const { title, subtitle } = titles[section] || titles.login;
		document.getElementById('page-title').textContent = title;
		document.getElementById('page-subtitle').textContent = subtitle;
	}

	async handleLogin() {
		const username = document.getElementById('username').value.trim();
		const password = document.getElementById('password').value;
		const messageContainer = document.getElementById('login-message');

		if (!username || !password) {
			this.showMessage(messageContainer, 'Please enter both username and password', 'error');
			return;
		}

		try {
			this.showMessage(messageContainer, 'Signing in...', 'info');

			// Verify credentials with the server
			const loginResponse = await fetch(`${this.apiBase}/api/login`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ username, password })
			});

			const loginData = await loginResponse.json();

			if (!loginResponse.ok) {
				this.showMessage(messageContainer, `Login failed: ${loginData.error}`, 'error');
				return;
			}

			// Store credentials and token (if exists)
			this.username = loginData.data?.username || username;
			this.token = loginData.data?.token || null;
			this.isAuthenticated = true;

			localStorage.setItem('zframe_username', this.username);
			if (this.token) {
				localStorage.setItem('zframe_token', this.token);
			}

			this.showMessage(messageContainer, 'Login successful!', 'success');

			this.loadUserStats();
			this.updateTokenDisplay();
		} catch (error) {
			console.error('Login error:', error);
			this.showMessage(messageContainer, 'Login failed. Please try again.', 'error');
		}
	}

	async generateNewToken() {
		const messageContainer = document.getElementById('token-message');

		try {
			this.showMessage(messageContainer, 'Generating token...', 'info');

			const response = await fetch(`${this.apiBase}/reset_token`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					username: this.username,
					token: this.token
				})
			});

			const data = await response.json();

			if (response.ok && data.success && data.data?.token) {
				this.token = data.data.token;
				localStorage.setItem('zframe_token', this.token);
				this.updateTokenDisplay();
				this.showMessage(messageContainer, 'Token generated successfully!', 'success');
			} else {
				this.showMessage(messageContainer, `Token generation failed: ${data.error}`, 'error');
			}

		} catch (error) {
			console.error('Token generation error:', error);
			this.showMessage(messageContainer, 'Failed to generate token. Please try again.', 'error');
		}
	}

	revokeToken() {
		if (confirm('Are you sure you want to revoke your current token? This will disable API access until you generate a new one.')) {
			this.token = null;
			localStorage.removeItem('zframe_token');
			this.updateTokenDisplay();

			const messageContainer = document.getElementById('token-message');
			this.showMessage(messageContainer, 'Token revoked successfully', 'success');
		}
	}

	updateTokenDisplay() {
		const tokenInput = document.getElementById('token-input');
		const tokenStatus = document.getElementById('token-status');
		const statusDot = tokenStatus.querySelector('.status-dot');
		const statusText = tokenStatus.querySelector('span:last-child');
		const revokeBtn = document.getElementById('revoke-token');

		if (this.token && this.token.trim() !== '') {
			tokenInput.value = this.token;
			statusDot.classList.add('active');
			statusText.textContent = 'Active';
			revokeBtn.disabled = false;
		} else {
			tokenInput.value = '';
			tokenInput.placeholder = 'No token generated';
			statusDot.classList.remove('active');
			statusText.textContent = 'No Token';
			revokeBtn.disabled = true;
		}
	}

	copyToken() {
		const tokenInput = document.getElementById('token-input');
		if (tokenInput.value) {
			navigator.clipboard.writeText(tokenInput.value).then(() => {
				const btn = document.getElementById('copy-token');
				const originalHTML = btn.innerHTML;
				btn.innerHTML = '<i class="fas fa-check"></i>';
				btn.style.color = 'var(--success-color)';

				setTimeout(() => {
					btn.innerHTML = originalHTML;
					btn.style.color = '';
				}, 2000);
			});
		}
	}

	handleLogout() {
		if (confirm('Are you sure you want to logout?')) {
			this.token = null;
			this.username = null;
			this.isAuthenticated = false;

			localStorage.removeItem('zframe_token');
			localStorage.removeItem('zframe_username');

			this.showUnauthenticatedState();
			this.navigateToSection('login');

			// Clear any data
			this.userImages = [];
			document.getElementById('image-gallery').innerHTML = '';
		}
	}

	handleFileSelect(file) {
		const uploadContent = document.querySelector('.upload-content');
		const uploadBtn = document.getElementById('upload-btn');

		uploadContent.innerHTML = `
            <i class="fas fa-check-circle upload-icon" style="color: var(--success-color);"></i>
            <h3>File Selected</h3>
            <p>${file.name} (${this.formatFileSize(file.size)})</p>
        `;

		uploadBtn.disabled = false;
		uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload ' + file.name;
	}

	async handleUpload() {
		const fileInput = document.getElementById('image-file');
		const formatSelect = document.getElementById('format');
		const messageContainer = document.getElementById('upload-message');
		const progressContainer = document.getElementById('upload-progress');
		const progressFill = document.querySelector('.progress-fill');
		const progressText = document.querySelector('.progress-text');
		const uploadBtn = document.getElementById('upload-btn');

		if (!fileInput) {
			alert('Upload form not properly loaded. Please refresh the page.');
			return;
		}

		if (!fileInput.files || !fileInput.files[0]) {
			this.showMessage(messageContainer, 'Please select a file first', 'error');
			return;
		}

		if (!this.token) {
			this.showMessage(messageContainer, 'Please generate an API token first. Go to Dashboard to generate your token.', 'error');
			return;
		}

		const formData = new FormData();
		formData.append('image', fileInput.files[0]);
		formData.append('token', this.token);

		if (formatSelect.value) {
			formData.append('format', formatSelect.value);
		}

		try {
			uploadBtn.disabled = true;
			uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

			progressContainer.classList.remove('hidden');
			progressFill.style.width = '0%';
			progressText.textContent = 'Uploading...';
			messageContainer.innerHTML = '';

			let progress = 0;
			const progressInterval = setInterval(() => {
				progress += Math.random() * 30;
				if (progress > 90) progress = 90;
				progressFill.style.width = progress + '%';
			}, 200);

			const response = await fetch(`${this.apiBase}/upload`, {
				method: 'POST',
				body: formData
			});

			clearInterval(progressInterval);
			progressFill.style.width = '100%';
			progressText.textContent = 'Processing...';

			const data = await response.json();

			if (response.ok && data.success && data.data?.filename) {
				progressText.textContent = 'Upload Complete!';
				this.showMessage(messageContainer, `Image uploaded successfully: ${data.data.filename}`, 'success');
				this.loadUserImages();
				this.loadUserStats();

				setTimeout(() => {
					progressContainer.classList.add('hidden');
					progressFill.style.width = '0%';
					uploadBtn.disabled = false;
					uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Image';
				}, 2000);
			} else {
				progressContainer.classList.add('hidden');
				this.showMessage(messageContainer, `Upload failed: ${data.error || 'Unknown error'}`, 'error');
				uploadBtn.disabled = false;
				uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Image';
			}
		} catch (error) {
			console.error('Upload error:', error);
			progressContainer.classList.add('hidden');
			this.showMessage(messageContainer, `Network error during upload: ${error.message}`, 'error');
			uploadBtn.disabled = false;
			uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Image';
		}
	}



	async loadUserStats() {
		try {
			await this.loadUserImages();
			document.getElementById('total-images').textContent = this.userImages.length;
		} catch (error) {
			console.error('Error loading stats:', error);
			document.getElementById('total-images').textContent = '0';
		}
	}

	async loadUserImages() {
		const galleryEl = document.getElementById('image-gallery');
		const messageContainer = document.getElementById('gallery-message');
		const imageCount = document.getElementById('image-count');

		try {
			this.showMessage(messageContainer, 'Loading images...', 'info');

			if (this.token) {
				const response = await fetch(`${this.apiBase}/api/user-images?token=${encodeURIComponent(this.token)}`);

				if (response.ok) {
					const data = await response.json();
					// Transform URLs to use /image/ route without extension
					const images = data.data?.images || [];
					this.userImages = images.map(img => {
						// Extract filename without extension (e.g., "1_7.jpg" -> "1_7")
						const filenameWithoutExt = img.filename.replace(/\.(jpg|png|webp)$/i, '');
						return {
							...img,
							url: `/image/${filenameWithoutExt}`
						};
					});
				} else {
					await this.loadImagesByPattern();
				}
			} else {
				await this.loadImagesByPattern();
			}

			if (this.userImages.length === 0) {
				galleryEl.innerHTML = `
                    <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                        <i class="fas fa-images" style="font-size: 4rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                        <h3 style="color: var(--text-primary); margin-bottom: 0.5rem;">No images found</h3>
                        <p style="color: var(--text-muted);">Upload your first image to get started!</p>
                    </div>
                `;
				imageCount.textContent = '0 images';
			} else {
				this.renderImages();
				imageCount.textContent = `${this.userImages.length} image${this.userImages.length !== 1 ? 's' : ''}`;
			}

		} catch (error) {
			console.error('Gallery load error:', error);
			this.showMessage(messageContainer, 'Failed to load images. Please try again.', 'error');
		} finally {
			// Always clear loading message
			messageContainer.innerHTML = '';
		}
	}

	async loadImagesByPattern() {
		this.userImages = [];

		for (let i = 1; i <= 100; i++) {
			const extensions = ['jpg', 'png', 'webp'];

			for (const ext of extensions) {
				try {
					const imageUrl = `${this.apiBase}/image/${i}`;
					const response = await fetch(imageUrl, { method: 'HEAD' });

					if (response.ok) {
						this.userImages.push({
							id: i,
							filename: `${i}.${ext}`,
							url: `/image/${i}`,
							size: 0,
							uploadDate: new Date(),
							extension: ext
						});
						break;
					}
				} catch (error) {
					continue;
				}
			}
		}

		this.userImages.sort((a, b) => b.id - a.id);
	}

	renderImages() {
		const galleryEl = document.getElementById('image-gallery');

		galleryEl.innerHTML = this.userImages.map(image =>
			this.createImageItemHTML(image)
		).join('');

		// Add click listeners
		galleryEl.querySelectorAll('.image-item').forEach((item, index) => {
			item.addEventListener('click', () => {
				this.openModal(this.userImages[index]);
			});
		});
	}

	createImageItemHTML(image) {
		const isListView = document.getElementById('image-gallery').classList.contains('list-view');
		const formattedSize = image.size ? this.formatFileSize(image.size) : 'Unknown size';
		const formattedDate = this.formatDate(new Date(image.uploadDate));

		if (isListView) {
			return `
                <div class="image-item">
                    <img src="${this.apiBase}${image.url}" alt="${image.filename}" loading="lazy">
                    <div class="image-info">
                        <h3>${image.filename}</h3>
                        <p>Image file • ${formattedSize}</p>
                        <div class="image-meta">
                            <span class="image-date">${formattedDate}</span>
                        </div>
                    </div>
                </div>
            `;
		} else {
			return `
                <div class="image-item">
                    <img src="${this.apiBase}${image.url}" alt="${image.filename}" loading="lazy">
                    <div class="image-info">
                        <h3>${image.filename}</h3>
                        <p>Click to view full size</p>
                        <div class="image-meta">
                            <span class="image-size">${formattedSize}</span>
                            <span class="image-date">${formattedDate}</span>
                        </div>
                    </div>
                </div>
            `;
		}
	}

	switchGalleryView(view) {
		const gallery = document.getElementById('image-gallery');
		gallery.className = `image-gallery ${view}-view`;

		if (this.userImages.length > 0) {
			this.renderImages();
		}
	}

	openModal(image) {
		const modal = document.getElementById('image-modal');
		const modalImage = document.getElementById('modal-image');
		const modalFilename = document.getElementById('modal-filename');

		modalImage.src = this.apiBase + image.url;
		modalImage.alt = image.filename;
		modalFilename.textContent = image.filename;

		this.currentImage = {
			...image,
			url: this.apiBase + image.url
		};

		modal.classList.remove('hidden');
		document.body.style.overflow = 'hidden';
	}

	closeModal() {
		const modal = document.getElementById('image-modal');
		modal.classList.add('hidden');
		document.body.style.overflow = 'auto';
		this.currentImage = null;
	}

	copyImageUrl() {
		if (this.currentImage) {
			navigator.clipboard.writeText(this.currentImage.url).then(() => {
				const btn = document.getElementById('copy-url');
				const originalHTML = btn.innerHTML;
				btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
				btn.style.background = 'var(--success-color)';

				setTimeout(() => {
					btn.innerHTML = originalHTML;
					btn.style.background = '';
				}, 2000);
			}).catch(err => {
				console.error('Failed to copy URL:', err);
			});
		}
	}

	downloadImage() {
		if (this.currentImage) {
			const link = document.createElement('a');
			link.href = this.currentImage.url;
			link.download = this.currentImage.filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		}
	}

	async deleteImage() {
		if (!this.currentImage) return;

		if (!confirm(`Are you sure you want to delete ${this.currentImage.filename}? This action cannot be undone.`)) {
			return;
		}

		if (!this.token) {
			alert('Please generate an API token first');
			return;
		}

		try {
			const response = await fetch(`${this.apiBase}/delete_image`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					token: this.token,
					filename: this.currentImage.filename
				})
			});

			const data = await response.json();

			if (response.ok && data.success) {
				// Save filename before closing modal
				const deletedFilename = this.currentImage.filename;

				// Close modal
				this.closeModal();

				// Remove from local array
				this.userImages = this.userImages.filter(img => img.filename !== deletedFilename);
				// Re-render the gallery immediately
				this.renderImages();

				// Update image count
				const imageCount = document.getElementById('image-count');
				if (imageCount) {
					imageCount.textContent = `${this.userImages.length} image${this.userImages.length !== 1 ? 's' : ''}`;
				}

				// Update total images stat
				const totalImages = document.getElementById('total-images');
				if (totalImages) {
					totalImages.textContent = this.userImages.length;
				}
				// Show success message
				const messageContainer = document.getElementById('gallery-message');
				this.showMessage(messageContainer, 'Image deleted successfully', 'success');
				setTimeout(() => {
					messageContainer.innerHTML = '';
				}, 3000);
			} else {
				alert(`Delete failed: ${data.error || 'Unknown error'}`);
			}
		} catch (error) {
			console.error('Delete error:', error);
			alert('Network error during delete. Please try again.');
		}
	}

	// Utility functions
	showMessage(container, message, type) {
		container.innerHTML = `<div class="message ${type}">${message}</div>`;
	}

	formatFileSize(bytes) {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	formatDate(date) {
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		}).format(date);
	}
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
	new ZFrame();
});