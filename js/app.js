/**
 * 人物头像素材库 - 核心逻辑
 *
 * 功能：
 * 1. Unsplash API 随机人像（支持筛选主题）
 * 2. 60+ 张备用池降级
 * 3. 倒计时计时器（10/20/30分钟/不限时）
 * 4. 收藏系统（IndexedDB + File System Access API）
 */

(function () {
    'use strict';

    // ==================== 用户配置 ====================
    const UNSPLASH_ACCESS_KEY = 'wfPMrvmHWRzs18F7T4vLADCXJfgPtGtcMLxHk1aj3ws';

    // ==================== DOM 引用 ====================
    const els = {
        image: document.getElementById('referenceImage'),
        loading: document.getElementById('loadingOverlay'),
        switchBtn: document.getElementById('switchBtn'),
        heartBtn: document.getElementById('heartBtn'),
        btnFavorites: document.getElementById('btnFavorites'),
        favoritesView: document.getElementById('favoritesView'),
        btnBack: document.getElementById('btnBack'),
        masonryGrid: document.getElementById('masonryGrid'),
        favoritesEmpty: document.getElementById('favoritesEmpty'),
        favoritesCount: document.getElementById('favoritesCount'),
        timerDisplay: document.getElementById('timerDisplay'),
        timerToggle: document.getElementById('timerToggle'),
        timerReset: document.getElementById('timerReset'),
        timerModeSelect: document.getElementById('timerModeSelect'),
    };

    // ==================== 状态 ====================
    let isLoading = false;
    let currentImageUrl = '';
    let currentPhotoPage = '';
    let currentPhotographer = '';
    let currentPhotographerUrl = '';
    let lastSwitchTime = 0;
    const SWITCH_COOLDOWN = 800;
    let apiAvailable = false;
    let currentQuery = 'portrait';

    // ==================== 搜索缓存 ====================
    let searchCache = {
        query: '',
        results: [],
        usedIndices: [],
        timestamp: 0,
        page: 1,
    };
    const CACHE_TTL = 5 * 60 * 1000; // 5分钟

    // ==================== 备用图片池（60+张）====================
    const fallbackImages = [
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80',
        'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80',
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80',
        'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80',
        'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80',
        'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=800&q=80',
        'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=800&q=80',
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800&q=80',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80',
        'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=800&q=80',
        'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=800&q=80',
        'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=800&q=80',
        'https://images.unsplash.com/photo-1463453091185-61582044d556?w=800&q=80',
        'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?w=800&q=80',
        'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=800&q=80',
        'https://images.unsplash.com/photo-1515077678510-ce3bdf418862?w=800&q=80',
        'https://images.unsplash.com/photo-1521119989659-a83c2c3d94f8?w=800&q=80',
        'https://images.unsplash.com/photo-1542596594-649edbc13630?w=800&q=80',
        'https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?w=800&q=80',
        'https://images.unsplash.com/photo-1499557354967-2b2d8910bcca?w=800&q=80',
        'https://images.unsplash.com/photo-1492446845049-9c50cc313f00?w=800&q=80',
        'https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=800&q=80',
        'https://images.unsplash.com/photo-1479936343636-73cdc5aae0c3?w=800&q=80',
        'https://images.unsplash.com/photo-1495366691023-cc4eadcc2d7e?w=800&q=80',
        'https://images.unsplash.com/photo-1482849297070-f4fae2173efe?w=800&q=80',
        'https://images.unsplash.com/photo-1502323777036-f29e3972d82f?w=800&q=80',
        'https://images.unsplash.com/photo-1512486130939-2c4f79935e4f?w=800&q=80',
        'https://images.unsplash.com/photo-1495078065017-564717e2e3f5?w=800&q=80',
        'https://images.unsplash.com/photo-1464863979621-258859e62245?w=800&q=80',
        'https://images.unsplash.com/photo-1489980557514-251d61e3f34c?w=800&q=80',
        'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=800&q=80',
        'https://images.unsplash.com/photo-1518710983660-e01a67cc24f9?w=800&q=80',
        'https://images.unsplash.com/photo-1469406396016-013bfae5d83e?w=800&q=80',
        'https://images.unsplash.com/photo-1518104593175-4c07f2a98502?w=800&q=80',
        'https://images.unsplash.com/photo-1520341280432-4749d4d7bcf9?w=800&q=80',
        'https://images.unsplash.com/photo-1512668406839-a1844c843a7c?w=800&q=80',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&q=80',
        'https://images.unsplash.com/photo-1514315384763-ba401779410f?w=800&q=80',
        'https://images.unsplash.com/photo-1520975661595-6453be3f7070?w=800&q=80',
        'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800&q=80',
        'https://images.unsplash.com/photo-1492288991661-058aa541ff43?w=800&q=80',
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800&q=80',
        'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=800&q=80',
        'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=800&q=80',
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&q=80',
        'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=800&q=80',
        'https://images.unsplash.com/photo-1599566150163-29194dcabd09?w=800&q=80',
        'https://images.unsplash.com/photo-1628157588553-5eeea00af15c?w=800&q=80',
        'https://images.unsplash.com/photo-1504593811423-6dd665756598?w=800&q=80',
        'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=800&q=80',
        'https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=800&q=80',
        'https://images.unsplash.com/photo-1542596768-5d1d21f1cf98?w=800&q=80',
        'https://images.unsplash.com/photo-1511551203524-9a24350a5771?w=800&q=80',
        'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=800&q=80',
    ];

    let shuffledIndices = [];
    let shufflePointer = 0;
    const recentHistory = [];
    const HISTORY_SIZE = 30;

    function shuffleArray(array) {
        const arr = array.slice();
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function getShuffledIndices() {
        if (shuffledIndices.length === 0 || shufflePointer >= shuffledIndices.length) {
            shuffledIndices = shuffleArray(fallbackImages.map(function (_, i) { return i; }));
            shufflePointer = 0;
        }
        return shuffledIndices;
    }

    function pickRandomFallback() {
        const indices = getShuffledIndices();
        let pickIndex = indices[shufflePointer];
        let attempts = 0;
        while (recentHistory.includes(pickIndex) && attempts < fallbackImages.length) {
            shufflePointer++;
            if (shufflePointer >= indices.length) {
                shuffledIndices = shuffleArray(fallbackImages.map(function (_, i) { return i; }));
                shufflePointer = 0;
            }
            pickIndex = indices[shufflePointer];
            attempts++;
        }
        shufflePointer++;
        recentHistory.push(pickIndex);
        if (recentHistory.length > HISTORY_SIZE) recentHistory.shift();
        return fallbackImages[pickIndex];
    }

    // ==================== Unsplash 官方 API ====================
    async function fetchFromUnsplashApi() {
        const now = Date.now();
        const cacheExpired = now - searchCache.timestamp > CACHE_TTL;
        const cacheEmpty = searchCache.results.length === 0;
        const queryChanged = searchCache.query !== currentQuery;
        const allUsed = searchCache.usedIndices.length >= searchCache.results.length;

        if (cacheEmpty || cacheExpired || queryChanged || allUsed) {
            const page = queryChanged ? 1 : (allUsed ? searchCache.page + 1 : 1);
            const url = 'https://api.unsplash.com/search/photos?query=' + encodeURIComponent(currentQuery) + '&orientation=portrait&per_page=30&page=' + page + '&client_id=' + UNSPLASH_ACCESS_KEY;
            const response = await fetch(url, { method: 'GET', headers: { 'Accept-Version': 'v1' } });
            if (!response.ok) throw new Error('API error: ' + response.status);
            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                throw new Error('No results for query: ' + currentQuery);
            }

            searchCache = {
                query: currentQuery,
                results: data.results,
                usedIndices: [],
                timestamp: now,
                page: page,
            };
        }

        const availableIndices = [];
        for (let i = 0; i < searchCache.results.length; i++) {
            if (!searchCache.usedIndices.includes(i)) {
                availableIndices.push(i);
            }
        }

        if (availableIndices.length === 0) {
            throw new Error('No available images in cache');
        }

        const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        searchCache.usedIndices.push(randomIndex);

        const photo = searchCache.results[randomIndex];
        const sep = photo.urls.regular.includes('?') ? '&' : '?';
        return {
            imageUrl: photo.urls.regular + sep + 'w=800&q=80',
            photoPage: photo.links.html,
            photographer: photo.user.name,
            photographerUrl: photo.user.links.html,
        };
    }

    // ==================== 加载逻辑 ====================
    function setLoading(loading) {
        isLoading = loading;
        els.switchBtn.disabled = loading;
        els.switchBtn.classList.toggle('loading', loading);
        if (loading) {
            els.loading.classList.remove('hidden');
            els.image.classList.remove('loaded');
        }
    }

    function displayImage(imageUrl, creditHtml) {
        els.image.onerror = function () {
            showError();
        };
        els.image.src = imageUrl;
        els.image.classList.add('loaded');
        els.loading.classList.add('hidden');
        setLoading(false);
        currentImageUrl = imageUrl;
        updateHeartState();
    }

    function showError() {
        els.loading.classList.add('hidden');
        setLoading(false);
    }

    async function loadNewImage() {
        if (isLoading) return;
        setLoading(true);

        if (UNSPLASH_ACCESS_KEY) {
            try {
                const data = await fetchFromUnsplashApi();
                apiAvailable = true;
                currentPhotoPage = data.photoPage;
                currentPhotographer = data.photographer;
                currentPhotographerUrl = data.photographerUrl;
                displayImage(data.imageUrl, '');
                return;
            } catch (err) {
                console.warn('Unsplash API 调用失败，降级到备用池：', err.message);
                apiAvailable = false;
            }
        }

        const imageUrl = pickRandomFallback() + '&t=' + Date.now();
        currentImageUrl = imageUrl;
        currentPhotoPage = '';
        currentPhotographer = '';
        currentPhotographerUrl = '';

        const tempImg = new Image();
        tempImg.onload = function () {
            displayImage(imageUrl, '');
        };
        tempImg.onerror = function () {
            showError();
        };

        const timeoutId = setTimeout(function () {
            tempImg.src = '';
            showError();
        }, 10000);

        tempImg.onload = (function (orig) {
            return function () { clearTimeout(timeoutId); orig(); };
        })(tempImg.onload);
        tempImg.onerror = (function (orig) {
            return function () { clearTimeout(timeoutId); orig(); };
        })(tempImg.onerror);

        tempImg.src = imageUrl;
    }

    // ==================== 计时器 ====================
    const Timer = {
        totalSeconds: 0,
        remainingSeconds: 0,
        intervalId: null,
        isRunning: false,
        currentMode: 0,

        start: function (minutes) {
            this.stop();
            this.currentMode = minutes;
            if (minutes === 0) {
                els.timerDisplay.textContent = '--:--';
                els.timerDisplay.classList.remove('flashing');
                return;
            }
            this.totalSeconds = minutes * 60;
            this.remainingSeconds = this.totalSeconds;
            this.isRunning = true;
            this.tick();
            this.intervalId = setInterval(function () { Timer.tick(); }, 1000);
            this.updateToggleIcon(true);
        },

        pause: function () {
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            this.isRunning = false;
            this.updateToggleIcon(false);
        },

        resume: function () {
            if (this.currentMode === 0 || this.remainingSeconds <= 0) return;
            if (this.isRunning) return;
            this.isRunning = true;
            this.tick();
            this.intervalId = setInterval(function () { Timer.tick(); }, 1000);
            this.updateToggleIcon(true);
        },

        stop: function () {
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            this.isRunning = false;
            els.timerDisplay.classList.remove('flashing');
            this.updateToggleIcon(false);
        },

        reset: function () {
            this.stop();
            if (this.currentMode === 0) {
                els.timerDisplay.textContent = '--:--';
            } else {
                this.remainingSeconds = this.currentMode * 60;
                this.updateDisplay();
            }
        },

        tick: function () {
            if (this.remainingSeconds <= 0) {
                this.onTimeUp();
                return;
            }
            this.remainingSeconds--;
            this.updateDisplay();
            if (this.remainingSeconds <= 5 && this.remainingSeconds > 0) {
                els.timerDisplay.classList.add('flashing');
            } else {
                els.timerDisplay.classList.remove('flashing');
            }
        },

        updateDisplay: function () {
            const m = Math.floor(this.remainingSeconds / 60);
            const s = this.remainingSeconds % 60;
            els.timerDisplay.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
        },

        onTimeUp: function () {
            this.stop();
            els.timerDisplay.textContent = '00:00';
            els.timerDisplay.classList.remove('flashing');
            const wrapper = document.getElementById('imageWrapper');
            wrapper.classList.remove('image-shake');
            void wrapper.offsetWidth;
            wrapper.classList.add('image-shake');
            setTimeout(function () {
                wrapper.classList.remove('image-shake');
            }, 500);
        },

        toggle: function () {
            if (this.currentMode === 0) return;
            if (this.isRunning) {
                this.pause();
            } else if (this.remainingSeconds > 0) {
                this.resume();
            } else {
                this.start(this.currentMode);
            }
        },

        updateToggleIcon: function (isPlaying) {
            const svg = els.timerToggle.querySelector('svg');
            if (isPlaying) {
                svg.innerHTML = '<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>';
            } else {
                svg.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"></polygon>';
            }
        },
    };

    function initTimer() {
        els.timerModeSelect.addEventListener('change', function () {
            const min = parseInt(els.timerModeSelect.value, 10);
            Timer.start(min);
        });

        els.timerToggle.addEventListener('click', function () {
            Timer.toggle();
        });

        els.timerReset.addEventListener('click', function () {
            Timer.reset();
        });
    }

    // ==================== IndexedDB 收藏 ====================
    const DB_NAME = 'portrait-favorites';
    const DB_STORE = 'favorites';
    let db = null;

    function initDB() {
        return new Promise(function (resolve, reject) {
            const request = indexedDB.open(DB_NAME, 1);
            request.onerror = function () { reject(request.error); };
            request.onsuccess = function () { db = request.result; resolve(db); };
            request.onupgradeneeded = function (event) {
                const database = event.target.result;
                if (!database.objectStoreNames.contains(DB_STORE)) {
                    const store = database.createObjectStore(DB_STORE, { keyPath: 'id', autoIncrement: true });
                    store.createIndex('imageUrl', 'imageUrl', { unique: true });
                }
            };
        });
    }

    async function isFavorited(imageUrl) {
        if (!db) return false;
        return new Promise(function (resolve) {
            const tx = db.transaction(DB_STORE, 'readonly');
            const store = tx.objectStore(DB_STORE);
            const index = store.index('imageUrl');
            const req = index.get(imageUrl);
            req.onsuccess = function () { resolve(!!req.result); };
            req.onerror = function () { resolve(false); };
        });
    }

    async function addFavoriteRecord(data) {
        if (!db) return;
        return new Promise(function (resolve, reject) {
            const tx = db.transaction(DB_STORE, 'readwrite');
            const store = tx.objectStore(DB_STORE);
            const req = store.add(data);
            req.onsuccess = function () { resolve(req.result); };
            req.onerror = function () { reject(req.error); };
        });
    }

    async function removeFavoriteRecord(imageUrl) {
        if (!db) return;
        return new Promise(function (resolve, reject) {
            const tx = db.transaction(DB_STORE, 'readwrite');
            const store = tx.objectStore(DB_STORE);
            const index = store.index('imageUrl');
            const getReq = index.get(imageUrl);
            getReq.onsuccess = function () {
                if (getReq.result) {
                    const delReq = store.delete(getReq.result.id);
                    delReq.onsuccess = function () { resolve(); };
                    delReq.onerror = function () { reject(delReq.error); };
                } else {
                    resolve();
                }
            };
            getReq.onerror = function () { reject(getReq.error); };
        });
    }

    async function getAllFavorites() {
        if (!db) return [];
        return new Promise(function (resolve, reject) {
            const tx = db.transaction(DB_STORE, 'readonly');
            const store = tx.objectStore(DB_STORE);
            const req = store.getAll();
            req.onsuccess = function () { resolve(req.result); };
            req.onerror = function () { reject(req.error); };
        });
    }

    // ==================== 收藏交互 ====================
    async function updateHeartState() {
        const favorited = await isFavorited(currentImageUrl);
        els.heartBtn.classList.toggle('favorited', favorited);
    }

    async function toggleFavorite() {
        if (!currentImageUrl) return;
        const favorited = await isFavorited(currentImageUrl);
        if (favorited) {
            await removeFavoriteRecord(currentImageUrl);
            els.heartBtn.classList.remove('favorited');
        } else {
            const record = {
                imageUrl: currentImageUrl,
                photoPage: currentPhotoPage,
                photographer: currentPhotographer,
                photographerUrl: currentPhotographerUrl,
                addedAt: Date.now(),
            };
            await addFavoriteRecord(record);
            els.heartBtn.classList.add('favorited');
            await tryDownloadImage(currentImageUrl);
        }
    }

    async function tryDownloadImage(imageUrl) {
        if (typeof showSaveFilePicker !== 'function') {
            fallbackDownload(imageUrl);
            return;
        }
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const ext = blob.type.includes('png') ? 'png' : 'jpg';
            const handle = await showSaveFilePicker({
                suggestedName: 'portrait_' + Date.now() + '.' + ext,
                types: [{ description: 'Image', accept: { 'image/*': ['.' + ext] } }],
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.warn('File System Access 保存失败，回退到下载：', err);
                fallbackDownload(imageUrl);
            }
        }
    }

    function fallbackDownload(imageUrl) {
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = 'portrait_' + Date.now() + '.jpg';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // ==================== 收藏夹视图 ====================
    async function renderFavorites() {
        const favorites = await getAllFavorites();
        els.favoritesCount.textContent = favorites.length + ' 张';
        els.masonryGrid.innerHTML = '';

        if (favorites.length === 0) {
            els.masonryGrid.style.display = 'none';
            els.favoritesEmpty.classList.add('active');
            return;
        }

        els.masonryGrid.style.display = 'block';
        els.favoritesEmpty.classList.remove('active');

        favorites.forEach(function (item) {
            const div = document.createElement('div');
            div.className = 'masonry-item';
            div.innerHTML = '<img src="' + item.imageUrl + '" alt="收藏图片" loading="lazy">' +
                '<button class="heart-btn favorited" data-url="' + item.imageUrl + '" title="取消收藏">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>' +
                '</button>';
            els.masonryGrid.appendChild(div);

            const img = div.querySelector('img');
            img.addEventListener('click', function () {
                window.open(item.imageUrl, '_blank');
            });
        });

        els.masonryGrid.querySelectorAll('.heart-btn').forEach(function (btn) {
            btn.addEventListener('click', async function (e) {
                e.stopPropagation();
                const url = btn.dataset.url;
                await removeFavoriteRecord(url);
                renderFavorites();
                if (url === currentImageUrl) {
                    els.heartBtn.classList.remove('favorited');
                }
            });
        });
    }

    function openFavorites() {
        renderFavorites();
        els.favoritesView.classList.add('active');
    }

    function closeFavorites() {
        els.favoritesView.classList.remove('active');
    }

    // ==================== 筛选标签 ====================
    function initFilterTags() {
        const tags = document.querySelectorAll('.filter-tag');
        tags.forEach(function (tag) {
            tag.addEventListener('click', function () {
                if (!UNSPLASH_ACCESS_KEY) {
                    alert('筛选功能需要配置 Unsplash API Key，请在 js/app.js 中填入 Access Key');
                    return;
                }
                if (isLoading) return;
                tags.forEach(function (t) { t.classList.remove('active'); });
                tag.classList.add('active');
                currentQuery = tag.dataset.query;
                // 切换筛选时清空缓存，确保新主题立即生效
                searchCache = { query: '', results: [], usedIndices: [], timestamp: 0, page: 1 };
                loadNewImage();
            });
        });
    }

    // ==================== 事件处理 ====================
    function handleSwitch() {
        const now = Date.now();
        if (now - lastSwitchTime < SWITCH_COOLDOWN) return;
        lastSwitchTime = now;
        loadNewImage();
    }

    function handleKeydown(e) {
        if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName)) {
            e.preventDefault();
            handleSwitch();
        }
    }

    function handleImageClick() {
        if (currentImageUrl && !isLoading) {
            window.open(currentImageUrl, '_blank');
        }
    }

    // ==================== 初始化 ====================
    async function init() {
        await initDB();
        els.switchBtn.addEventListener('click', handleSwitch);
        document.addEventListener('keydown', handleKeydown);
        els.image.addEventListener('click', handleImageClick);
        els.heartBtn.addEventListener('click', toggleFavorite);
        els.btnFavorites.addEventListener('click', openFavorites);
        els.btnBack.addEventListener('click', closeFavorites);
        initFilterTags();
        initTimer();
        loadNewImage();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
